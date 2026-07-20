import type { LoginCredentials, SignupDetails, DeviceSessionOptions, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { createAccessToken } from '#security/tokens.js';
import { prisma } from '#db/prisma.js';
import { hashPassword, verifyPassword } from '#security/passwords.js';

const DEV_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'BeOnEdge',
  lastName: 'Client',
  email: 'client@beonedge.local',
  phone: '+910000000000',
  role: 'client',
  status: 'approved',
  riskProfileStatus: 'complete',
  kycStatus: 'verified',
};

const ENV_ADMIN_REFRESH_PREFIX = 'env_admin_refresh_';
const REFRESH_TOKEN_TTL_DAYS = 365;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

function normalizeEmail(value: any) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value: any) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  let canonicalDigits = digits;
  if (!raw.startsWith('+')) {
    if (digits.length === 10) {
      canonicalDigits = `91${digits}`;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      canonicalDigits = `91${digits.slice(1)}`;
    } else if (digits.startsWith('00')) {
      canonicalDigits = digits.slice(2);
    }
  }

  if (canonicalDigits.length < 8 || canonicalDigits.length > 15) return '';
  return `+${canonicalDigits}`;
}

function normalizeUsername(value: any) {
  return String(value || '').trim().toLowerCase();
}

function normalizeIdentifier(body: any) {
  const raw = String(body.identifier || body.email || body.phone || '').trim();
  const email = normalizeEmail(raw);
  const phone = raw.includes('@') ? '' : normalizePhone(raw);
  const username = raw.includes('@') ? '' : normalizeUsername(raw);

  return {
    raw,
    email,
    phone,
    username,
  };
}

function safeEqualText(left: any, right: any) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function assertSignupAllowed(config: AppConfig, headers: Record<string, string | string[] | undefined> = {}) {
  const secret = String(config.signupProxySecret || '');
  if (secret) {
    const provided = String(headers['x-signup-key'] || '');
    if (!safeEqualText(provided, secret)) {
      throw new HttpError(403, 'SIGNUP_NOT_ALLOWED', 'Account creation is not permitted from this client.');
    }
    return;
  }

  const allowedOrigin = String(config.signupAllowedOrigin || '');
  if (allowedOrigin) {
    const origin = String(headers.origin || '');
    if (origin !== allowedOrigin) {
      throw new HttpError(403, 'SIGNUP_NOT_ALLOWED', 'Account creation is not permitted from this origin.');
    }
  }
}

function envAdminUser(config: AppConfig) {
  const loginId = String(config.adminLoginId || '').trim();
  if (!loginId) return null;

  const email = loginId.includes('@') ? normalizeEmail(loginId) : '';
  const phone = email ? '' : normalizePhone(loginId);

  return {
    id: config.adminUserId,
    firstName: config.adminFirstName || 'BeOnEdge',
    lastName: config.adminLastName || 'Admin',
    email,
    phone: config.adminPhone || phone,
    username: email ? '' : loginId,
    role: 'admin',
    status: 'approved',
    riskProfileStatus: 'approved',
    kycStatus: 'approved',
  };
}

function isEnvAdminIdentifier(config: AppConfig, identifier: any) {
  const loginId = String(config.adminLoginId || '').trim();
  if (!loginId || !identifier.raw) return false;

  if (loginId.includes('@')) {
    return identifier.email === normalizeEmail(loginId);
  }

  return identifier.raw === loginId || identifier.phone === normalizePhone(loginId);
}

function splitName(value: any, email: any) {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    const local = String(email || 'Client').split('@')[0] || 'Client';
    return { firstName: local, lastName: 'Client' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || 'Client',
  };
}

function toApiUser(user: any) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    username: user.username || null,
    role: user.role,
    status: user.status,
    approvalRef: user.approvalRef || null,
    riskProfileStatus: user.riskProfileStatus,
    kycStatus: user.kycStatus,
  };
}

function prismaUserToApiUser(user: any) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    username: user.username || null,
    role: user.role,
    status: user.status,
    approvalRef: null,
    riskProfileStatus: user.riskProfileStatus,
    kycStatus: user.kycStatus,
  };
}

function hashToken(token: any) {
  return createHash('sha256').update(token).digest('hex');
}

function clientIp(headers: Record<string, string | string[] | undefined> = {}) {
  const forwarded = headers['x-forwarded-for'];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || '')
    .split(',')[0]
    .trim() || null;
}

async function findUserByIdentifier(config: AppConfig, identifier: any) {
  const orConditions: any[] = [];
  if (identifier.email) orConditions.push({ email: identifier.email });
  if (identifier.phone) orConditions.push({ phone: identifier.phone });
  if (identifier.username) orConditions.push({ username: identifier.username });

  if (orConditions.length === 0) return null;

  const user = await prisma.user.findFirst({
    where: { OR: orConditions },
  });

  return user;
}

async function createDeviceSession(config: AppConfig, user: any, { headers = {}, body = {} }: DeviceSessionOptions = {}) {
  const refreshToken = randomBytes(32).toString('base64url');
  const refreshTokenHash = hashToken(refreshToken);
  const deviceId = String((body as any).deviceId || headers['x-device-id'] || randomUUID()).slice(0, 160);
  const userAgent = String(headers['user-agent'] || '').slice(0, 512) || null;
  const ipAddress = clientIp(headers);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  // Revoke existing sessions for same user+device
  await prisma.deviceSession.updateMany({
    where: {
      userId: user.id,
      deviceId,
      revokedAt: null,
    },
    data: {
      revokedAt: now,
      updatedAt: now,
    },
  });

  const session = await prisma.deviceSession.create({
    data: {
      userId: user.id,
      deviceId,
      refreshTokenHash,
      userAgent,
      ipAddress,
      lastSeenAt: now,
      expiresAt,
    },
  });

  return {
    deviceSessionId: session.id,
    refreshToken,
  };
}

async function rotateRefreshToken(config: AppConfig, refreshToken: any) {
  if (!refreshToken) {
    throw new HttpError(400, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required.');
  }

  const oldHash = hashToken(refreshToken);
  const nextRefreshToken = randomBytes(32).toString('base64url');
  const nextHash = hashToken(nextRefreshToken);

  const now = new Date();

  const session = await prisma.deviceSession.findFirst({
    where: {
      refreshTokenHash: oldHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!session) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  const user = await prisma.user.findFirst({
    where: { id: session.userId },
  });

  if (!user) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  if (user.status === 'suspended' || user.status === 'closed') {
    throw new HttpError(403, 'USER_NOT_ALLOWED', 'This account cannot refresh a session.', {
      status: user.status,
    });
  }

  await prisma.deviceSession.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: nextHash,
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      lastSeenAt: now,
    },
  });

  const apiUser = prismaUserToApiUser(user);
  const accessToken = createAccessToken({
    sub: apiUser.id,
    role: apiUser.role,
    deviceSessionId: session.id,
  }, config);

  return {
    user: apiUser,
    accessToken,
    refreshToken: nextRefreshToken,
    deviceSessionId: session.id,
  };
}

function devLogin(body: any, config: AppConfig) {
  const identifier = body.identifier || body.email || body.phone;
  if (!identifier || !body.password) {
    throw new HttpError(400, 'LOGIN_FIELDS_REQUIRED', 'Identifier and password are required.');
  }

  const deviceSessionId = randomUUID();
  const accessToken = createAccessToken({
    sub: DEV_USER.id,
    role: DEV_USER.role,
    deviceSessionId,
  }, config);

  return {
    user: DEV_USER,
    accessToken,
    refreshToken: `dev_refresh_${deviceSessionId}`,
    deviceSessionId,
  };
}

function envAdminLogin(body: any, config: AppConfig) {
  if (!config.adminPassword || !safeEqualText(body.password, config.adminPassword)) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email, phone, or password.');
  }

  const user = envAdminUser(config);
  const deviceSessionId = randomUUID();
  const accessToken = createAccessToken({
    sub: user!.id,
    role: user!.role,
    deviceSessionId,
  }, config);

  return {
    user,
    accessToken,
    refreshToken: `${ENV_ADMIN_REFRESH_PREFIX}${deviceSessionId}.${randomBytes(24).toString('base64url')}`,
    deviceSessionId,
  };
}

function envAdminRefresh(config: AppConfig, refreshToken: any) {
  if (!String(refreshToken || '').startsWith(ENV_ADMIN_REFRESH_PREFIX)) return null;

  const user = envAdminUser(config);
  if (!user) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }

  const deviceSessionId = randomUUID();
  const accessToken = createAccessToken({
    sub: user!.id,
    role: user!.role,
    deviceSessionId,
  }, config);

  return {
    user,
    accessToken,
    refreshToken: `${ENV_ADMIN_REFRESH_PREFIX}${deviceSessionId}.${randomBytes(24).toString('base64url')}`,
    deviceSessionId,
  };
}

export async function login(body: any, config: AppConfig, requestContext: RequestContext = {}) {
  const identifier = normalizeIdentifier(body);
  if (!identifier.raw || !body.password) {
    throw new HttpError(400, 'LOGIN_FIELDS_REQUIRED', 'Identifier and password are required.');
  }

  if (isEnvAdminIdentifier(config, identifier)) {
    return envAdminLogin(body, config);
  }

  let user = null;
  if (config.databaseUrl || (config.databaseHost && config.databaseName && config.databaseUser)) {
    user = await findUserByIdentifier(config, identifier);
  }

  if (!user) {
    if (config.allowDevAuth) return devLogin(body, config);
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email, phone, or password.');
  }

  const passwordOk = await verifyPassword(body.password, user.passwordHash);
  if (!passwordOk) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email, phone, or password.');
  }

  if (user.status === 'suspended' || user.status === 'closed') {
    throw new HttpError(403, 'USER_NOT_ALLOWED', 'This account cannot sign in.', {
      status: user.status,
    });
  }

  const apiUser = prismaUserToApiUser(user);
  const deviceSession = await createDeviceSession(config, apiUser, {
    headers: requestContext.headers,
    body,
  });
  const accessToken = createAccessToken({
    sub: apiUser.id,
    role: apiUser.role,
    deviceSessionId: deviceSession.deviceSessionId,
  }, config);

  return {
    user: apiUser,
    accessToken,
    refreshToken: deviceSession.refreshToken,
    deviceSessionId: deviceSession.deviceSessionId,
  };
}

export async function signup(body: any, config: AppConfig, requestContext: RequestContext = {}) {
  assertSignupAllowed(config, requestContext.headers || {});

  const email = normalizeEmail(body.email || body.identifier);
  const phone = normalizePhone(body.phone);
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, 'EMAIL_REQUIRED', 'Enter a valid email address.');
  }
  if (!phone) {
    throw new HttpError(400, 'PHONE_REQUIRED', 'Enter a valid phone number.');
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, 'USERNAME_INVALID', 'Username must be 3-30 chars: lowercase letters, numbers, underscore.');
  }
  if (password.length < 8) {
    throw new HttpError(400, 'PASSWORD_TOO_SHORT', 'Password must be at least 8 characters.');
  }

  const { firstName, lastName } = splitName(body.name, email);
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        username,
        passwordHash,
        role: 'client',
        status: 'pending_review',
        riskProfileStatus: 'pending',
        kycStatus: 'pending',
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new HttpError(409, 'ACCOUNT_EXISTS', 'An account already exists for this email, phone, or username.');
    }
    throw error;
  }

  const apiUser = prismaUserToApiUser(user);
  const deviceSession = await createDeviceSession(config, apiUser, {
    headers: requestContext.headers,
    body,
  });
  const accessToken = createAccessToken({
    sub: apiUser.id,
    role: apiUser.role,
    deviceSessionId: deviceSession.deviceSessionId,
  }, config);

  return {
    user: apiUser,
    accessToken,
    refreshToken: deviceSession.refreshToken,
    deviceSessionId: deviceSession.deviceSessionId,
  };
}

export async function refreshSession(body: any, config: AppConfig) {
  const envAdmin = envAdminRefresh(config, body.refreshToken);
  if (envAdmin) return envAdmin;

  return rotateRefreshToken(config, body.refreshToken);
}

export function session(actor: Actor) {
  if (!actor) return { authenticated: false };
  return {
    authenticated: true,
    user: {
      id: actor.userId,
      role: actor.role,
      status: actor.status,
    },
    deviceSessionId: actor.deviceSessionId,
  };
}

export async function logout(actor: Actor, config: AppConfig) {
  if (actor?.deviceSessionId) {
    const now = new Date();
    await prisma.deviceSession.updateMany({
      where: {
        id: actor.deviceSessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        updatedAt: now,
      },
    });
  }

  return { loggedOut: true };
}
