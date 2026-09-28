import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config/config.js';

export interface TokenPayload {
  userId: string;
  role: string;
  /** Refresh session the access token belongs to; revoking the session revokes the token. */
  sid?: string;
}

export const generateAccessToken = (userId: string, role: string = 'user', sessionId?: string): string => {
  return jwt.sign(
    sessionId ? { userId, role, sid: sessionId } : { userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
};

export const generateRefreshToken = (userId: string, role: string = 'user'): string => {
  return jwt.sign(
    { userId, role },
    config.refreshTokenSecret,
    {
      expiresIn: config.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
      jwtid: crypto.randomUUID(),
    }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.refreshTokenSecret) as TokenPayload;
};

// Backward-compatible alias
export const verifyAuthToken = verifyAccessToken;

// bcrypt only reads the first 72 bytes, which every JWT for the same user shares, so tokens are stored as SHA-256.
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const tokenHashesMatch = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
};

export const getTokenExpiry = (token: string): Date => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  return new Date((decoded?.exp ?? Math.floor(Date.now() / 1000)) * 1000);
};

export const ACCESS_TOKEN_COOKIE_PATH = '/';
export const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';
const LEGACY_REFRESH_TOKEN_COOKIE_PATH = '/api/auth/refresh';

const baseCookieOptions = () => {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
  };
};

const remainingLifetimeMs = (token: string): number => {
  return Math.max(0, getTokenExpiry(token).getTime() - Date.now());
};

export const setAccessCookie = (res: Response, accessToken: string, persistent = true): void => {
  res.cookie('auth_token', accessToken, {
    ...baseCookieOptions(),
    ...(persistent ? { maxAge: remainingLifetimeMs(accessToken) } : {}),
    path: ACCESS_TOKEN_COOKIE_PATH,
  });
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string, persistent = true): void => {
  setAccessCookie(res, accessToken, persistent);

  res.cookie('refresh_token', refreshToken, {
    ...baseCookieOptions(),
    ...(persistent ? { maxAge: remainingLifetimeMs(refreshToken) } : {}),
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
};

export const clearAuthCookies = (res: Response): void => {
  const options = baseCookieOptions();

  res.clearCookie('auth_token', { ...options, path: ACCESS_TOKEN_COOKIE_PATH });
  res.clearCookie('refresh_token', { ...options, path: REFRESH_TOKEN_COOKIE_PATH });
  res.clearCookie('refresh_token', { ...options, path: LEGACY_REFRESH_TOKEN_COOKIE_PATH });
};
