import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AppConfig, TokenClaims } from '#types/index.js';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url' as any);
}

function decode(value: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(value, 'base64url' as any).toString('utf8')) as Record<string, unknown>;
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url' as any);
}

const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export function createAccessToken(
  claims: Record<string, unknown>,
  config: AppConfig,
  ttlSeconds: number = ACCESS_TOKEN_TTL_SECONDS,
): string {
  const now = Math.floor(Date.now() / 1000);
  const { status: _status, ...safeClaims } = claims || {};
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    iss: 'beonedge-backend',
    aud: 'beonedge-client',
    iat: now,
    exp: now + ttlSeconds,
    ...safeClaims,
  });
  const input = `${header}.${payload}`;
  return `${input}.${sign(input, config.accessTokenSecret)}`;
}

export function verifyAccessToken(token: string, config: AppConfig): TokenClaims | null {
  if (!token || !config.accessTokenSecret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const [header, payload, signature] = parts;
    const decodedHeader = decode(header);
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;

    const expected = sign(`${header}.${payload}`, config.accessTokenSecret);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

    const claims = decode(payload) as TokenClaims;
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== 'beonedge-backend' || claims.aud !== 'beonedge-client') return null;
    if (!claims.sub || !claims.role || !claims.exp || claims.exp < now) return null;

    return claims;
  } catch {
    return null;
  }
}
