import { createHmac, timingSafeEqual } from 'node:crypto';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(input, secret) {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

const ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export function createAccessToken(claims, config, ttlSeconds = ACCESS_TOKEN_TTL_SECONDS) {
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

export function verifyAccessToken(token, config) {
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

    const claims = decode(payload);
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== 'beonedge-backend' || claims.aud !== 'beonedge-client') return null;
    if (!claims.sub || !claims.role || !claims.exp || claims.exp < now) return null;

    return claims;
  } catch {
    return null;
  }
}
