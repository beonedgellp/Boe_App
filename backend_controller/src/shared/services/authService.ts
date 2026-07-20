import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../../http/errors.js';
import { createAccessToken } from '../../security/tokens.js';
import { hashPassword, verifyPassword } from '../../security/passwords.js';
import { AppConfig } from '../../config/env.js';
import prisma from '../../db/prisma.js';
import { Actor } from '../../security/auth.js';

const REFRESH_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const ENV_ADMIN_REFRESH_PREFIX = 'env_admin_refresh_';

interface AuthResult {
  user: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
  deviceSessionId: string;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  let canonical = digits;
  if (!raw.startsWith('+')) {
    if (digits.length === 10) canonical = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith('0')) canonical = `91${digits.slice(1)}`;
  }
  if (canonical.length < 8 || canonical.length > 15) return '';
  return `+${canonical}`;
}


function safeEqualText(left: string, right: string): boolean {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && timingSafeEqual(a, b);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toApiUser(user: any): Record<string, unknown> {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    username: user.username || null,
    role: user.role,
    status: user.status,
    riskProfileStatus: user.riskProfileStatus,
    kycStatus: user.kycStatus,
  };
}

function envAdminUser(config: AppConfig) {
  const loginId = config.adminLoginId.trim();
  if (!loginId) return null;
  const email = loginId.includes('@') ? normalizeEmail(loginId) : '';
  return {
    id: config.adminUserId,
    firstName: config.adminFirstName,
    lastName: config.adminLastName,
    email,
    phone: config.adminPhone || '',
    username: email ? '' : loginId,
    role: 'admin',
    status: 'approved',
    riskProfileStatus: 'approved',
    kycStatus: 'approved',
  };
}

function isEnvAdminIdentifier(config: AppConfig, email: string, phone: string): boolean {
  const loginId = config.adminLoginId.trim();
  if (!loginId) return false;
  if (loginId.includes('@')) return email === normalizeEmail(loginId);
  return phone === normalizePhone(loginId) || email === loginId;
}


export async function login(body: any, config: AppConfig, ctx: { headers?: any } = {}): Promise<AuthResult> {
  const raw = String(body.identifier || '').trim();
  const email = normalizeEmail(raw);
  const phone = raw.includes('@') ? '' : normalizePhone(raw);

  if (!raw || !body.password) {
    throw new HttpError(400, 'LOGIN_FIELDS_REQUIRED', 'Identifier and password are required.');
  }

  if (isEnvAdminIdentifier(config, email, phone)) {
    if (!config.adminPassword || !safeEqualText(body.password, config.adminPassword)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email, phone, or password.');
    }
    const user = envAdminUser(config)!;
    const deviceSessionId = randomUUID();
    const accessToken = createAccessToken({ sub: user.id, role: user.role, deviceSessionId }, config);
    return {
      user,
      accessToken,
      refreshToken: `${ENV_ADMIN_REFRESH_PREFIX}${deviceSessionId}.${randomBytes(24).toString('base64url')}`,
      deviceSessionId,
    };
  }

  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : []), ...(raw ? [{ username: raw.toLowerCase() }] : [])] },
  });

  if (!dbUser) {
    if (config.allowDevAuth) {
      const deviceSessionId = randomUUID();
      const accessToken = createAccessToken({ sub: 'dev-user', role: 'client', deviceSessionId }, config);
      return { user: { id: 'dev-user', role: 'client', status: 'approved' }, accessToken, refreshToken: `dev_refresh_${deviceSessionId}`, deviceSessionId };
    }
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email, phone, or password.');
  }

  const passwordOk = await verifyPassword(body.password, dbUser.passwordHash || '');
  if (!passwordOk) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email, phone, or password.');
  if (dbUser.status === 'suspended' || dbUser.status === 'closed') {
    throw new HttpError(403, 'USER_NOT_ALLOWED', 'This account cannot sign in.', { status: dbUser.status });
  }

  const refreshToken = randomBytes(32).toString('base64url');
  const session = await prisma.deviceSession.create({
    data: {
      userId: dbUser.id,
      deviceId: randomUUID(),
      refreshTokenHash: hashToken(refreshToken),
      userAgent: ctx.headers?.['user-agent'] || null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  const accessToken = createAccessToken({ sub: dbUser.id, role: dbUser.role, deviceSessionId: session.id }, config);
  return { user: toApiUser(dbUser), accessToken, refreshToken, deviceSessionId: session.id };
}


export async function signup(body: any, config: AppConfig, ctx: { headers?: any } = {}): Promise<AuthResult> {
  const email = normalizeEmail(body.email || '');
  const phone = normalizePhone(body.phone || '');
  const username = (body.username || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email) throw new HttpError(400, 'EMAIL_REQUIRED', 'Enter a valid email address.');
  if (!phone) throw new HttpError(400, 'PHONE_REQUIRED', 'Enter a valid phone number.');

  const nameParts = String(body.name || '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || email.split('@')[0];
  const lastName = nameParts.slice(1).join(' ') || 'Client';
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.user.create({
      data: { firstName, lastName, email, phone, username: username || null, passwordHash, role: 'client', status: 'pending_review', riskProfileStatus: 'pending', kycStatus: 'pending' },
    });
  } catch (err: any) {
    if (err.code === 'P2002') throw new HttpError(409, 'ACCOUNT_EXISTS', 'An account already exists for this email, phone, or username.');
    throw err;
  }

  const refreshToken = randomBytes(32).toString('base64url');
  const session = await prisma.deviceSession.create({
    data: { userId: user.id, deviceId: randomUUID(), refreshTokenHash: hashToken(refreshToken), userAgent: ctx.headers?.['user-agent'] || null, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  });
  const accessToken = createAccessToken({ sub: user.id, role: user.role, deviceSessionId: session.id }, config);
  return { user: toApiUser(user), accessToken, refreshToken, deviceSessionId: session.id };
}

export async function refreshSession(body: { refreshToken: string }, config: AppConfig): Promise<AuthResult> {
  const { refreshToken } = body;
  if (!refreshToken) throw new HttpError(400, 'REFRESH_TOKEN_REQUIRED', 'Refresh token is required.');

  // Env admin refresh
  if (refreshToken.startsWith(ENV_ADMIN_REFRESH_PREFIX)) {
    const user = envAdminUser(config);
    if (!user) throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
    const deviceSessionId = randomUUID();
    const accessToken = createAccessToken({ sub: user.id, role: user.role, deviceSessionId }, config);
    return { user, accessToken, refreshToken: `${ENV_ADMIN_REFRESH_PREFIX}${deviceSessionId}.${randomBytes(24).toString('base64url')}`, deviceSessionId };
  }

  const oldHash = hashToken(refreshToken);
  const session = await prisma.deviceSession.findFirst({
    where: { refreshTokenHash: oldHash, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!session) throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');

  const newRefreshToken = randomBytes(32).toString('base64url');
  await prisma.deviceSession.update({ where: { id: session.id }, data: { refreshTokenHash: hashToken(newRefreshToken), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) } });
  const accessToken = createAccessToken({ sub: session.user.id, role: session.user.role, deviceSessionId: session.id }, config);
  return { user: toApiUser(session.user), accessToken, refreshToken: newRefreshToken, deviceSessionId: session.id };
}

export async function logout(actor: Actor, config: AppConfig): Promise<void> {
  if (actor.deviceSessionId) {
    await prisma.deviceSession.updateMany({ where: { id: actor.deviceSessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}

export function session(actor: Actor | null) {
  if (!actor) return { authenticated: false };
  return { authenticated: true, user: { id: actor.userId, role: actor.role, status: actor.status }, deviceSessionId: actor.deviceSessionId };
}
