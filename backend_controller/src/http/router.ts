import express, { Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import type { Application } from 'express';
import { HttpError } from './errors.js';
import { requestId } from './response.js';
import { authenticateRequest, authorizeRoute } from '#security/auth.js';
import type {
  Actor,
  AppConfig,
  Cookie,
  HandlerResponse,
  HttpMethod,
  Logger,
  RouteContext,
  RouteHandler,
  RouteMeta,
  RouteOptions,
  RouteGroup,
  UnknownRecord,
} from '#types/index.js';

// ────────────────────────────────────────────────────────────────
// Rate limiter (in-process, same logic as before)
// ────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOWS_MS = 15 * 60 * 1000;
const RATE_LIMIT_DEFAULT_MAX = 100;
const RATE_LIMIT_SENSITIVE_MAX = 3;
const RATE_LIMIT_AUTH_MAX = 30;
const RATE_LIMIT_MODERATE_MAX = 10;
const RATE_LIMIT_ADMIN_MAX = 30;

interface MethodPattern { method: HttpMethod; pattern: RegExp }

const AUTH_ROUTES: MethodPattern[] = [
  { method: 'POST', pattern: /^\/v1\/auth\/login$/ },
  { method: 'POST', pattern: /^\/v1\/auth\/signup$/ },
  { method: 'POST', pattern: /^\/v1\/auth\/refresh$/ },
];
const SENSITIVE_ROUTES: MethodPattern[] = [
  { method: 'POST', pattern: /^\/v1\/client\/payments\/[^/]+\/retry$/ },
  { method: 'POST', pattern: /^\/v1\/client\/mandates\/[^/]+\/authorize$/ },
  { method: 'POST', pattern: /^\/v1\/client\/withdrawals$/ },
  { method: 'POST', pattern: /^\/v1\/client\/redemptions$/ },
];
const ADMIN_ROUTES: MethodPattern[] = [
  { method: 'PATCH', pattern: /^\/v1\/admin\/users\/[^/]+\/status$/ },
];
const MODERATE_ROUTES: MethodPattern[] = [
  { method: 'POST', pattern: /^\/v1\/onboarding\// },
];

function matchesPatternList(list: MethodPattern[], method: string, path: string): boolean {
  return list.some((r) => r.method === method && r.pattern.test(path));
}

function rateLimitMax(method: string, pathname: string): number {
  if (matchesPatternList(AUTH_ROUTES, method, pathname)) return RATE_LIMIT_AUTH_MAX;
  if (matchesPatternList(SENSITIVE_ROUTES, method, pathname)) return RATE_LIMIT_SENSITIVE_MAX;
  if (matchesPatternList(MODERATE_ROUTES, method, pathname)) return RATE_LIMIT_MODERATE_MAX;
  if (matchesPatternList(ADMIN_ROUTES, method, pathname)) return RATE_LIMIT_ADMIN_MAX;
  return RATE_LIMIT_DEFAULT_MAX;
}

function getRateLimitKey(method: string, pathname: string, ip: string): string {
  if (matchesPatternList(MODERATE_ROUTES, method, pathname)) return `${ip}:moderate:onboarding`;
  return `${ip}:${method}:${pathname}`;
}

class RateLimiter {
  private requests = new Map<string, number>();
  private windows = new Map<string, number>();

  isAllowed(method: string, pathname: string, ip: string): { allowed: boolean; retryAfter?: number } {
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
      return { allowed: false, retryAfter: Math.ceil((windowStart + RATE_LIMIT_WINDOWS_MS - now) / 1000) };
    }
    return { allowed: true };
  }
}

// ────────────────────────────────────────────────────────────────
// Express augmentation: attach app-level context to Request
// ────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      /** Unique request ID */
      requestId: string;
      /** Authenticated actor (null if unauthenticated route) */
      actor: Actor | null;
      /** App config injected by middleware */
      appConfig: AppConfig;
      /** Route metadata for authorization */
      routeMeta: RouteMeta;
      /** Raw body string for webhook signature verification */
      rawBody?: string;
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Router class: wraps Express app + keeps describe() for scripts
// ────────────────────────────────────────────────────────────────

export class Router {
  readonly app: Application;
  readonly config: AppConfig;
  readonly logger: Partial<Logger>;
  private routeRegistry: RouteMeta[] = [];
  private rateLimiter = new RateLimiter();

  constructor({ config, logger = console }: { config: AppConfig; logger?: Partial<Logger> }) {
    this.config = config;
    this.logger = logger;

    const app = express();

    // ── Global middleware ──
    app.disable('x-powered-by');

    // Raw body capture (for webhook signature verification)
    app.use(express.json({
      limit: '1mb',
      verify: (req: any, _res: any, buf: Buffer) => { req.rawBody = buf.toString('utf8'); },
    }));

    // Inject config + requestId
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.appConfig = config;
      req.requestId = requestId();
      next();
    });

    // CORS
    app.use((req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      const allowed = config.corsOrigins;
      const allowOrigin = allowed.includes('*') ? '*' : allowed.find((o) => o === origin);
      if (allowOrigin) {
        res.setHeader('access-control-allow-origin', allowOrigin);
        res.setHeader('vary', 'origin');
      }
      res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('access-control-allow-headers', 'authorization,content-type,x-beonedge-signature,x-request-id');
      res.setHeader('access-control-allow-credentials', 'true');

      if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
      next();
    });

    // Security headers
    app.use((_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('x-frame-options', 'DENY');
      res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';");
      res.setHeader('x-xss-protection', '1; mode=block');
      res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
      res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
      next();
    });

    // Rate limiting
    app.use((req: Request, res: Response, next: NextFunction) => {
      const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
      const rateCheck = this.rateLimiter.isAllowed(req.method, req.path, ip);
      if (!rateCheck.allowed) {
        res.setHeader('retry-after', String(rateCheck.retryAfter));
        next(new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.'));
        return;
      }
      next();
    });

    this.app = app;
  }

  // ── Route registration methods (same API as before) ──

  private wrapHandler(method: HttpMethod, path: string, options: RouteOptions, handler: RouteHandler) {
    const meta: RouteMeta = {
      method,
      path,
      group: options.group || 'public',
      auth: options.auth ?? true,
      roles: options.roles || [],
      allowPendingClient: options.allowPendingClient || false,
      allowDisabledAccount: options.allowDisabledAccount || false,
      description: options.description || '',
    };
    this.routeRegistry.push(meta);

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Auth
        req.routeMeta = meta;
        const actor: Actor | null = meta.auth
          ? await authenticateRequest(req as any, this.config)
          : null;
        if (meta.auth) authorizeRoute(meta as any, actor);
        req.actor = actor;

        // Build RouteContext for handler (backwards-compatible)
        const context: RouteContext = {
          requestId: req.requestId,
          config: this.config,
          actor,
          params: req.params as Record<string, string>,
          query: req.query as Record<string, string>,
          body: (req.body || {}) as UnknownRecord,
          headers: req.headers as Record<string, string | string[] | undefined>,
          route: meta,
          req,
        };

        const result = normalizeResult(await handler(context));

        // Set cookies
        if (result.cookies && result.cookies.length > 0) {
          for (const c of result.cookies) {
            const opts: any = {};
            if (c.httpOnly) opts.httpOnly = true;
            if (c.secure) opts.secure = true;
            if (c.sameSite) opts.sameSite = c.sameSite.toLowerCase();
            if (c.maxAge !== undefined) opts.maxAge = c.maxAge * 1000;
            if (c.path) opts.path = c.path;
            res.cookie(c.name, c.value, opts);
          }
        }

        // Set response headers
        res.setHeader('x-request-id', req.requestId);
        if (result.headers) {
          for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
        }

        if (result.status === 204) {
          res.sendStatus(204);
          return;
        }

        res.status(result.status || 200).json({
          ok: true,
          data: result.body ?? null,
          requestId: req.requestId,
        });
      } catch (err) {
        next(err);
      } finally {
        this.logger.info?.(`${req.method} ${req.originalUrl} ${Date.now() - (req as any)._startTime || 0}ms ${req.requestId}`);
      }
    };
  }

  private expressPath(path: string): string {
    // Convert :param style (already Express-compatible) — no change needed
    return path;
  }

  get(path: string, options: RouteOptions, handler: RouteHandler): void {
    this.app.get(this.expressPath(path), this.wrapHandler('GET', path, options, handler));
  }

  post(path: string, options: RouteOptions, handler: RouteHandler): void {
    this.app.post(this.expressPath(path), this.wrapHandler('POST', path, options, handler));
  }

  patch(path: string, options: RouteOptions, handler: RouteHandler): void {
    this.app.patch(this.expressPath(path), this.wrapHandler('PATCH', path, options, handler));
  }

  delete(path: string, options: RouteOptions, handler: RouteHandler): void {
    this.app.delete(this.expressPath(path), this.wrapHandler('DELETE', path, options, handler));
  }

  register(method: HttpMethod, path: string, options: RouteOptions, handler: RouteHandler): void {
    const m = method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete';
    this[m](path, options, handler);
  }

  // ── Finalize: attach error handler (call after all routes registered) ──

  finalize(): Application {
    // 404 fallback
    this.app.use((req: Request, res: Response, _next: NextFunction) => {
      res.status(404).json({
        ok: false,
        error: { code: 'ROUTE_NOT_FOUND', message: `No route registered for ${req.method} ${req.path}.` },
        requestId: req.requestId,
      });
    });

    // Central error handler
    this.app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
      const httpError = err instanceof HttpError ? err : null;
      const status = httpError ? httpError.status : 500;
      const code = httpError ? httpError.code : 'INTERNAL_ERROR';
      const message = status === 500
        ? 'Unexpected server error.'
        : err instanceof Error ? err.message : String(err);
      const details = httpError ? httpError.details : undefined;

      res.status(status).json({
        ok: false,
        error: { code, message, details },
        requestId: req.requestId,
      });
    });

    return this.app;
  }

  // ── Introspection (used by scripts/print-routes, authz checks) ──

  describe(): Array<Pick<RouteMeta, 'method' | 'path' | 'group' | 'auth' | 'roles' | 'allowPendingClient' | 'description'>> {
    return this.routeRegistry.map(({ method, path, group, auth, roles, allowPendingClient, description }) => ({
      method, path, group, auth, roles, allowPendingClient, description,
    }));
  }
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function normalizeResult(result: unknown): Required<Pick<HandlerResponse, 'status' | 'cookies'>> & HandlerResponse {
  if (result == null) return { status: 204, body: null, cookies: [] };
  const maybe = result as HandlerResponse;
  if (typeof maybe.status === 'number') {
    return { ...maybe, status: maybe.status, cookies: maybe.cookies || [] };
  }
  return { status: 200, body: result, cookies: [] };
}
