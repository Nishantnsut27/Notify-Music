import { BACKEND_URL } from '../config/constants';

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

import { getStoredToken, setStoredToken, removeStoredToken, isRememberMe } from './tokenStorage';

const UNREACHABLE_MESSAGE = 'Unable to reach the server. Please check your connection and try again.';

/* Credential and OTP endpoints answer 401 for a wrong password or code, not for
   an expired access token, so a refresh there would only end a valid session. */
const NO_REFRESH_PATH = /\/api\/auth\/(login|register|send-otp|verify-otp|forgot-password|verify-reset-otp|reset-password|resend-[\w-]+|refresh)(?:[/?#]|$)/;

type RefreshResult = 'refreshed' | 'expired' | 'unavailable';

let refreshPromise: Promise<RefreshResult> | null = null;

/**
 * Only a 401/403 from /refresh means the session is over. A 5xx, a cold-start
 * 502 or a dropped connection says nothing about the session, so it is kept and
 * the caller gets a retryable error instead.
 */
async function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.token) {
        setStoredToken(data.token, isRememberMe());
        return 'refreshed';
      }
      if (res.status === 401 || res.status === 403) {
        removeStoredToken();
        window.dispatchEvent(new Event('auth:session-expired'));
        return 'expired';
      }
      return 'unavailable';
    } catch {
      return 'unavailable';
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
  retries = 1,
  delay = 300,
  hasRefreshedToken = false
): Promise<T> {
  try {
    const savedToken = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (savedToken) {
      headers['Authorization'] = `Bearer ${savedToken}`;
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && !hasRefreshedToken && !NO_REFRESH_PATH.test(url)) {
        const refreshed = await refreshAccessToken();
        if (refreshed === 'refreshed') {
          return fetchJson<T>(url, options, retries, delay, true);
        }
        if (refreshed === 'unavailable') {
          throw new ApiError(UNREACHABLE_MESSAGE, 503, data);
        }
      }

      const errorMessage = data?.error || data?.message || `HTTP error status ${response.status}`;

      if (retries > 0 && (response.status === 429 || response.status >= 500)) {
        const method = options?.method?.toUpperCase() || 'GET';
        if (method === 'GET') {
          let retryDelay = delay;
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              const parsed = parseInt(retryAfter, 10);
              if (!isNaN(parsed)) retryDelay = parsed * 1000;
            }
          }
          await new Promise((res) => setTimeout(res, retryDelay));
          return fetchJson<T>(url, options, retries - 1, retryDelay > delay ? retryDelay : delay * 2, hasRefreshedToken);
        }
      }

      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (error) {
    if (options?.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    const method = options?.method?.toUpperCase() || 'GET';
    if (retries > 0 && method === 'GET') {
      await new Promise((res) => setTimeout(res, delay));
      return fetchJson<T>(url, options, retries - 1, delay * 2, hasRefreshedToken);
    }
    throw new ApiError(UNREACHABLE_MESSAGE, 0);
  }
}
