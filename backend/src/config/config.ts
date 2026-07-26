import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jiosaavnApiUrl: process.env.JIOSAAVN_API_URL || 'https://saavn.sumit.co',
  jamendoApiUrl: process.env.JAMENDO_API_URL || 'https://api.jamendo.com/v3.0',
  jamendoClientId: process.env.JAMENDO_CLIENT_ID || '2fa42d8a',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://notify-music-player.vercel.app').split(',').map(origin => origin.trim()),
  rateLimitSearchWindowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || '60000', 10),
  rateLimitSearchMax: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '300', 10),
  rateLimitMetadataWindowMs: parseInt(process.env.RATE_LIMIT_METADATA_WINDOW_MS || '60000', 10),
  rateLimitMetadataMax: parseInt(process.env.RATE_LIMIT_METADATA_MAX || '600', 10),
  slowDownSearchDelayAfter: parseInt(process.env.SLOW_DOWN_SEARCH_DELAY_AFTER || '100', 10),
  slowDownSearchDelayMs: parseInt(process.env.SLOW_DOWN_SEARCH_DELAY_MS || '500', 10),
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '300000', 10)
};
