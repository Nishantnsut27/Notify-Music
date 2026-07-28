import axios from 'axios';
import { logger, serializeError } from './logger.js';
import { MUSIC_ENGINE_CONFIG } from '../config/musicEngineConfig.js';

const TRANSIENT_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT'
]);

function isRetryableStatus(status?: number): boolean {
  if (!status) return true;
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status < 600);
}

export function isTransientRequestError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error;
  }

  const status = error.response?.status;
  if (status === 401 || status === 403 || status === 404 || (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 425 && status !== 429)) {
    return false;
  }

  if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) {
    return true;
  }

  return isRetryableStatus(status);
}

function getRetryDelay(attempt: number): number {
  return MUSIC_ENGINE_CONFIG.retryDelayMs * attempt;
}

export async function requestWithRetry<T>(
  scope: string,
  action: string,
  requestFn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MUSIC_ENGINE_CONFIG.maxRetryAttempts; attempt++) {
    try {
      if (attempt > 1) {
        logger.warn(scope, `Retrying ${action}`, { attempt, ...context });
      }

      return await requestFn();
    } catch (error) {
      lastError = error;

      if (!isTransientRequestError(error) || attempt >= MUSIC_ENGINE_CONFIG.maxRetryAttempts) {
        logger.error(scope, `Failed ${action}`, { attempt, ...context, error: serializeError(error) });
        throw error;
      }

      logger.warn(scope, `Transient failure during ${action}`, { attempt, ...context, error: serializeError(error) });
      await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${action}`);
}