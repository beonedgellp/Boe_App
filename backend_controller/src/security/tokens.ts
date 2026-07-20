import jwt from 'jsonwebtoken';
import { AppConfig } from '../config/env.js';

const ACCESS_TOKEN_TTL = '24h';

export interface TokenClaims {
  sub: string;
  role: string;
  deviceSessionId?: string;
}

export interface DecodedToken {
  sub: string;
  role: string;
  deviceSessionId?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

export function createAccessToken(claims: TokenClaims, config: AppConfig): string {
  return jwt.sign(
    {
      sub: claims.sub,
      role: claims.role,
      deviceSessionId: claims.deviceSessionId,
    },
    config.accessTokenSecret,
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: 'beonedge-backend',
      audience: 'beonedge-client',
    }
  );
}

export function verifyAccessToken(token: string, config: AppConfig): DecodedToken | null {
  if (!token || !config.accessTokenSecret) return null;

  try {
    const decoded = jwt.verify(token, config.accessTokenSecret, {
      issuer: 'beonedge-backend',
      audience: 'beonedge-client',
    }) as DecodedToken;

    if (!decoded.sub || !decoded.role) return null;
    return decoded;
  } catch {
    return null;
  }
}
