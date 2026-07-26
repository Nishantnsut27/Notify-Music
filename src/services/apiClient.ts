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
}

export async function fetchJson<T>(url: string, options?: RequestInit, retries = 2, delay = 300): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (retries > 0 && (response.status === 429 || response.status >= 500)) {
        await new Promise(res => setTimeout(res, delay));
        return fetchJson<T>(url, options, retries - 1, delay * 2);
      }
      throw new ApiError(
        response.status === 429
          ? 'Music search is temporarily busy. Please wait a moment or click retry.'
          : `HTTP error status ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (retries > 0) {
      await new Promise(res => setTimeout(res, delay));
      return fetchJson<T>(url, options, retries - 1, delay * 2);
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
  }
}
