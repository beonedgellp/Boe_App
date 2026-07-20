import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../http/errors.js';
import { verifyAccessToken } from './tokens.js';
import { config, AppConfig } from '../config/env.js';
import prisma from '../db/prisma.js';

export interface Actor {
  userId: string;
  role: string;
  status: string;
  deviceSessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: Actor | null;
    }
  }
}

function bearerToken(req: Request): string {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  const cookieToken = req.cookies?.access_token;
  return cookieToken || '';
}


export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(req);
  const claims = verifyAccessToken(token, config);

  if (!claims) {
    req.actor = null;
    next();
    return;
  }

  // Env-backed admin shortcut
  if (claims.role === 'admin' && claims.sub === config.adminUserId) {
    req.actor = {
      userId: claims.sub,
      role: 'admin',
      status: 'approved',
      deviceSessionId: claims.deviceSessionId,
    };
    next();
    return;
  }

  try {
    if (claims.deviceSessionId) {
      const session = await prisma.deviceSession.findFirst({
        where: {
          id: claims.deviceSessionId,
          userId: claims.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        req.actor = null;
        next();
        return;
      }

      req.actor = {
        userId: session.user.id,
        role: session.user.role,
        status: session.user.status,
        deviceSessionId: session.id,
      };
    } else {
      const user = await prisma.user.findUnique({ where: { id: claims.sub } });
      if (!user) {
        req.actor = null;
        next();
        return;
      }
      req.actor = {
        userId: user.id,
        role: user.role,
        status: user.status,
        deviceSessionId: claims.deviceSessionId,
      };
    }
  } catch {
    req.actor = null;
  }

  next();
}


export interface RouteAuthOptions {
  auth?: boolean;
  roles?: string[];
  allowPendingClient?: boolean;
  allowDisabledAccount?: boolean;
  group?: string;
}

export function requireAuth(options: RouteAuthOptions = {}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (options.auth === false) {
      next();
      return;
    }

    const actor = req.actor;
    if (!actor) {
      next(new HttpError(401, 'AUTH_REQUIRED', 'Authentication is required for this route.'));
      return;
    }

    if (!options.allowDisabledAccount && (actor.status === 'suspended' || actor.status === 'closed')) {
      next(new HttpError(403, 'ACCOUNT_DISABLED', 'This account is not allowed to access the application.', {
        status: actor.status,
      }));
      return;
    }

    if (options.roles && options.roles.length > 0 && !options.roles.includes(actor.role)) {
      next(new HttpError(403, 'ROLE_FORBIDDEN', 'The authenticated user is not allowed to access this route.', {
        allowedRoles: options.roles,
      }));
      return;
    }

    if (options.group === 'client' && actor.role === 'client' && actor.status !== 'approved' && !options.allowPendingClient) {
      next(new HttpError(403, 'USER_NOT_APPROVED', 'This account is not approved for client app data yet.', {
        status: actor.status,
      }));
      return;
    }

    next();
  };
}
