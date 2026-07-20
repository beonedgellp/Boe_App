import { HttpError } from '#http/errors.js';
import { verifyAccessToken } from './tokens.js';
import { hasDatabaseConfig, prisma } from '#db/client.js';
import type { Actor, AppConfig, Role, RouteMeta, TokenClaims } from '#types/index.js';

interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

function bearerToken(req: RequestLike): string {
  const header = (req.headers.authorization as string | undefined) || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  const cookieHeader = (req.headers.cookie as string | undefined) || '';
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function activeSessionActor(claims: TokenClaims, config: AppConfig): Promise<Actor | null> {
  // Environment-backed admin: tokens issued by envAdminLogin reference a
  // deviceSessionId that has no device_sessions row. The actor is derived
  // from config, not the database (same contract as the env-admin login).
  if (claims.role === 'admin' && claims.sub === config.adminUserId) {
    return {
      userId: claims.sub,
      role: 'admin',
      status: 'approved',
      deviceSessionId: claims.deviceSessionId,
    };
  }

  if (!hasDatabaseConfig(config)) {
    return null;
  }

  if (!claims.deviceSessionId) {
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: true, status: true },
    });
    if (!user) return null;

    return {
      userId: user.id,
      role: user.role as Role,
      status: user.status,
      deviceSessionId: claims.deviceSessionId,
    };
  }

  const session = await prisma.deviceSession.findFirst({
    where: {
      id: claims.deviceSessionId,
      userId: claims.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      user: { select: { id: true, role: true, status: true } },
    },
  });
  if (!session) return null;

  return {
    userId: session.user.id,
    role: session.user.role as Role,
    status: session.user.status,
    deviceSessionId: session.id,
  };
}

export async function authenticateRequest(req: RequestLike, config: AppConfig): Promise<Actor | null> {
  const token = bearerToken(req);
  const claims = verifyAccessToken(token, config);
  if (!claims) return null;

  return activeSessionActor(claims, config);
}

export function authorizeRoute(route: RouteMeta, actor: Actor | null): void {
  if (route.auth === false) return;

  if (!actor) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required for this route.');
  }

  if (!route.allowDisabledAccount && (actor.status === 'suspended' || actor.status === 'closed')) {
    throw new HttpError(403, 'ACCOUNT_DISABLED', 'This account is not allowed to access the application.', {
      status: actor.status,
    });
  }

  if (route.roles.length > 0 && !route.roles.includes(actor.role)) {
    throw new HttpError(403, 'ROLE_FORBIDDEN', 'The authenticated user is not allowed to access this route.', {
      allowedRoles: route.roles,
    });
  }

  if (route.group === 'client' && actor.role === 'client' && actor.status !== 'approved' && !route.allowPendingClient) {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'This account is not approved for client app data yet.', {
      status: actor.status,
    });
  }
}
