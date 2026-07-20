import { HttpError } from '#http/errors.js';
import { verifyAccessToken } from './tokens.js';
import { hasDatabaseConfig, query } from '#db/client.js';

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  // Fallback to cookie
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function activeSessionActor(claims, config) {
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
    const result = await query(config, `
      SELECT id, role::text, status::text
      FROM users
      WHERE id = $1
      LIMIT 1
    `, [claims.sub]);
    const row = result.rows[0];
    if (!row) return null;

    return {
      userId: row.id,
      role: row.role,
      status: row.status,
      deviceSessionId: claims.deviceSessionId,
    };
  }

  const result = await query(config, `
    SELECT u.id, u.role::text, u.status::text, ds.id AS device_session_id
    FROM device_sessions ds
    JOIN users u ON u.id = ds.user_id
    WHERE ds.id = $1
      AND ds.user_id = $2
      AND ds.revoked_at IS NULL
      AND ds.expires_at > now()
    LIMIT 1
  `, [claims.deviceSessionId, claims.sub]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    userId: row.id,
    role: row.role,
    status: row.status,
    deviceSessionId: row.device_session_id,
  };
}

export async function authenticateRequest(req, config) {
  const token = bearerToken(req);
  const claims = verifyAccessToken(token, config);
  if (!claims) return null;

  return activeSessionActor(claims, config);
}

export function authorizeRoute(route, actor) {
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
