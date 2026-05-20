import { HttpError } from './errors.js';
import { readJsonBody, requestId, sendError, sendJson } from './response.js';
import { authenticateRequest, authorizeRoute } from '#security/auth.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const RATE_LIMIT_WINDOWS_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_DEFAULT_MAX = 100;
const RATE_LIMIT_SENSITIVE_MAX = 3;
const RATE_LIMIT_AUTH_MAX = 30;
const RATE_LIMIT_MODERATE_MAX = 10;
const RATE_LIMIT_ADMIN_MAX = 30;

const AUTH_ROUTES = [
  { method: 'POST', pattern: /^\/v1\/auth\/login$/ },
  { method: 'POST', pattern: /^\/v1\/auth\/signup$/ },
  { method: 'POST', pattern: /^\/v1\/auth\/refresh$/ },
];

const SENSITIVE_ROUTES = [
  { method: 'POST', pattern: /^\/v1\/client\/payments\/[^/]+\/retry$/ },
  { method: 'POST', pattern: /^\/v1\/client\/mandates\/[^/]+\/authorize$/ },
  { method: 'POST', pattern: /^\/v1\/client\/withdrawals$/ },
  { method: 'POST', pattern: /^\/v1\/client\/redemptions$/ },
];

const ADMIN_ROUTES = [
  { method: 'PATCH', pattern: /^\/v1\/admin\/users\/[^/]+\/status$/ },
];

function isAuthRoute(method, pathname) {
  return AUTH_ROUTES.some((r) => r.method === method && r.pattern.test(pathname));
}

function isSensitiveRoute(method, pathname) {
  return SENSITIVE_ROUTES.some((r) => r.method === method && r.pattern.test(pathname));
}

function isAdminRoute(method, pathname) {
  return ADMIN_ROUTES.some((r) => r.method === method && r.pattern.test(pathname));
}

const MODERATE_ROUTES = [
  { method: 'POST', pattern: /^\/v1\/onboarding\// },
];

function isModerateRoute(method, pathname) {
  return MODERATE_ROUTES.some((r) => r.method === method && r.pattern.test(pathname));
}

function getRateLimitKey(method, pathname, ip) {
  if (isModerateRoute(method, pathname)) return `${ip}:moderate:onboarding`;
  return `${ip}:${method}:${pathname}`;
}

function rateLimitMax(method, pathname) {
  if (isAuthRoute(method, pathname)) return RATE_LIMIT_AUTH_MAX;
  if (isSensitiveRoute(method, pathname)) return RATE_LIMIT_SENSITIVE_MAX;
  if (isModerateRoute(method, pathname)) return RATE_LIMIT_MODERATE_MAX;
  if (isAdminRoute(method, pathname)) return RATE_LIMIT_ADMIN_MAX;
  return RATE_LIMIT_DEFAULT_MAX;
}

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.windows = new Map();
  }

  isAllowed(method, pathname, ip) {
    const now = Date.now();
    const key = getRateLimitKey(method, pathname, ip);
    const windowStart = this.windows.get(key) || 0;

    if (now - windowStart > RATE_LIMIT_WINDOWS_MS) {
      this.windows.set(key, now);
      this.requests.set(key, 1);
      return { allowed: true };
    }

    const count = (this.requests.get(key) || 0) + 1;
    const max = rateLimitMax(method, pathname);
    this.requests.set(key, count);

    if (count > max) {
      return {
        allowed: false,
        retryAfter: Math.ceil((windowStart + RATE_LIMIT_WINDOWS_MS - now) / 1000),
      };
    }
    return { allowed: true };
  }
}

function compilePath(path) {
  const keys = [];
  const pattern = path
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        keys.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return { keys, regex: new RegExp(`^${pattern}$`) };
}

function matchRoute(route, method, pathname) {
  if (route.method !== method) return null;

  const match = route.regex.exec(pathname);
  if (!match) return null;

  return route.keys.reduce((params, key, index) => {
    params[key] = decodeURIComponent(match[index + 1]);
    return params;
  }, {});
}

function normalizeResult(result) {
  if (result == null) return { status: 204, body: null, cookies: [] };
  if (typeof result.status === 'number') return { ...result, cookies: result.cookies || [] };
  return { status: 200, body: result, cookies: [] };
}

export class Router {
  constructor({ config, logger = console }) {
    this.config = config;
    this.logger = logger;
    this.routes = [];
    this.rateLimiter = new RateLimiter();
  }

  register(method, path, options, handler) {
    const compiled = compilePath(path);
    this.routes.push({
      method,
      path,
      ...compiled,
      group: options.group || 'public',
      auth: options.auth ?? true,
      roles: options.roles || [],
      allowPendingClient: options.allowPendingClient || false,
      description: options.description || '',
      handler,
    });
  }

  get(path, options, handler) {
    this.register('GET', path, options, handler);
  }

  post(path, options, handler) {
    this.register('POST', path, options, handler);
  }

  patch(path, options, handler) {
    this.register('PATCH', path, options, handler);
  }

  delete(path, options, handler) {
    this.register('DELETE', path, options, handler);
  }

  applySecurityHeaders(res) {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
    res.setHeader('x-xss-protection', '1; mode=block');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  }

  async handle(req, res) {
    const startedAt = Date.now();
    const id = requestId();

    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const route = this.routes.find((candidate) => matchRoute(candidate, req.method, url.pathname));

      this.applyCors(req, res);
      this.applySecurityHeaders(res);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!route) {
        throw new HttpError(404, 'ROUTE_NOT_FOUND', `No route registered for ${req.method} ${url.pathname}.`);
      }

      const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const rateCheck = this.rateLimiter.isAllowed(req.method, url.pathname, clientIp);
      if (!rateCheck.allowed) {
        res.setHeader('retry-after', String(rateCheck.retryAfter));
        throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
      }

      const params = matchRoute(route, req.method, url.pathname);
      const actor = await authenticateRequest(req, this.config);
      authorizeRoute(route, actor);

      const body = METHODS_WITH_BODY.has(req.method) ? await readJsonBody(req) : {};
      const context = {
        requestId: id,
        config: this.config,
        actor,
        params,
        query: Object.fromEntries(url.searchParams.entries()),
        body,
        headers: req.headers,
        route,
        req,
      };

      const result = normalizeResult(await route.handler(context));
      const responseHeaders = { 'x-request-id': id };

      if (result.cookies && result.cookies.length > 0) {
        responseHeaders['set-cookie'] = result.cookies.map((c) => {
          let cookie = `${c.name}=${c.value}`;
          if (c.httpOnly) cookie += '; HttpOnly';
          if (c.secure) cookie += '; Secure';
          if (c.sameSite) cookie += `; SameSite=${c.sameSite}`;
          if (c.maxAge !== undefined) cookie += `; Max-Age=${c.maxAge}`;
          if (c.path) cookie += `; Path=${c.path}`;
          return cookie;
        });
      }

      if (result.status === 204) {
        res.writeHead(204, responseHeaders);
        res.end();
        return;
      }

      sendJson(res, result.status || 200, {
        ok: true,
        data: result.body ?? null,
        requestId: id,
      }, responseHeaders);
    } catch (error) {
      sendError(res, error, { requestId: id });
    } finally {
      this.logger.info?.(`${req.method} ${req.url} ${Date.now() - startedAt}ms ${id}`);
    }
  }

  applyCors(req, res) {
    const origin = req.headers.origin;
    const allowed = this.config.corsOrigins;
    const allowOrigin = allowed.includes('*') ? '*' : allowed.find((item) => item === origin);

    if (allowOrigin) {
      res.setHeader('access-control-allow-origin', allowOrigin);
      res.setHeader('vary', 'origin');
    }

    res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('access-control-allow-headers', 'authorization,content-type,x-beonedge-signature,x-request-id');
    res.setHeader('access-control-allow-credentials', 'true');
  }

  describe() {
    return this.routes.map(({ method, path, group, auth, roles, allowPendingClient, description }) => ({
      method,
      path,
      group,
      auth,
      roles,
      allowPendingClient,
      description,
    }));
  }
}
