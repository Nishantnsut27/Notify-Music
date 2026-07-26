import { rateLimit } from 'express-rate-limit';
import { slowDown } from 'express-slow-down';
import { config } from '../config/config.js';

export const searchLimiter = rateLimit({
  windowMs: config.rateLimitSearchWindowMs,
  max: config.rateLimitSearchMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: [],
    error: 'Too many search requests. Please slow down and try again later.'
  }
});

export const searchSlowDown = slowDown({
  windowMs: config.rateLimitSearchWindowMs,
  delayAfter: config.slowDownSearchDelayAfter,
  delayMs: (hits) => (hits - config.slowDownSearchDelayAfter) * config.slowDownSearchDelayMs
});

export const metadataLimiter = rateLimit({
  windowMs: config.rateLimitMetadataWindowMs,
  max: config.rateLimitMetadataMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: 'Rate limit exceeded for metadata operations. Please try again in a minute.'
  }
});

export const healthLimiter = rateLimit({
  windowMs: 60000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    error: 'Too many health check requests.'
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 25, // limit each IP to 25 authentication requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});
