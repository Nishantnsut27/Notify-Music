import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config/config.js';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (userId: string, role: string = 'user'): string => {
  return jwt.sign(
    { userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
};

export const generateRefreshToken = (userId: string, role: string = 'user'): string => {
  return jwt.sign(
    { userId, role },
    config.refreshTokenSecret,
    { expiresIn: config.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'] }
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

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const isProd = config.nodeEnv === 'production';

  // Access Token Cookie (15 min)
  res.cookie('auth_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  // Refresh Token Cookie (7 days)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
};

export const clearAuthCookies = (res: Response): void => {
  const isProd = config.nodeEnv === 'production';

  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth/refresh',
  });
};

// Backward-compatible alias
export const setAuthCookie = (res: Response, token: string): void => {
  const isProd = config.nodeEnv === 'production';
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

export const clearAuthCookie = clearAuthCookies;
