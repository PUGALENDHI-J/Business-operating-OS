import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

export interface AccessTokenPayload {
  sub: string; // users.id
  userType: 'staff' | 'customer';
  roles: string[]; // role names, e.g. ['Admin']
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiresIn as never });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string; // refresh_tokens.id — allows single-session revocation on logout
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: `${config.jwt.refreshExpiresInDays}d`,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}
