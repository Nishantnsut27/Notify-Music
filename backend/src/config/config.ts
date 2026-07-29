import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'notify_music_player',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || '',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  jiosaavnApiUrl: process.env.JIOSAAVN_API_URL || 'https://notify-music-api.vercel.app',
  jamendoApiUrl: process.env.JAMENDO_API_URL || 'https://api.jamendo.com/v3.0',
  jamendoClientId: process.env.JAMENDO_CLIENT_ID || '',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '8000', 10),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000,https://notify-music.vercel.app').split(',').map(origin => origin.trim()),
  rateLimitSearchWindowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || '60000', 10),
  rateLimitSearchMax: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '300', 10),
  rateLimitMetadataWindowMs: parseInt(process.env.RATE_LIMIT_METADATA_WINDOW_MS || '60000', 10),
  rateLimitMetadataMax: parseInt(process.env.RATE_LIMIT_METADATA_MAX || '600', 10),
  slowDownSearchDelayAfter: parseInt(process.env.SLOW_DOWN_SEARCH_DELAY_AFTER || '100', 10),
  slowDownSearchDelayMs: parseInt(process.env.SLOW_DOWN_SEARCH_DELAY_MS || '500', 10),
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '300000', 10)
};

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true,
});

export { cloudinary };

export const validateConfig = (): void => {
  if (!config.mongodbUri) {
    throw new Error('❌ Startup Error: MONGODB_URI environment variable is missing.');
  }
  if (!config.jwtSecret) {
    throw new Error('❌ Startup Error: JWT_SECRET environment variable is missing.');
  }
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) {
    throw new Error('❌ Startup Error: Cloudinary environment variables are missing.');
  }
};
