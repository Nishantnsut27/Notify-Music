import { config } from '../config/config.js';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private inFlightMap = new Map<string, Promise<unknown>>();
  private generations = new Map<string, number>();
  private ttlMs: number;

  constructor(ttlMs: number = config.cacheTtlMs) {
    this.ttlMs = ttlMs;
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  public set<T>(key: string, data: T, customTtlMs?: number): void {
    const expiresAt = Date.now() + (customTtlMs || this.ttlMs);
    this.cache.set(key, { data, expiresAt });

    if (this.cache.size > 2000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  public delete(key: string): void {
    this.cache.delete(key);
    this.inFlightMap.delete(key);
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
  }

  /**
   * `resolveTtlMs` may shorten the TTL for a specific result or return 0 to skip caching it
   * (e.g. degraded fallback data that should not outlive the upstream outage).
   */
  public async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    customTtlMs?: number,
    refresh = false,
    resolveTtlMs?: (result: T) => number | undefined
  ): Promise<T> {
    const cached = refresh ? null : this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const existingPromise = this.inFlightMap.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const generation = this.generations.get(key) ?? 0;
    const promise: Promise<T> = (async () => {
      const result = await fetchFn();
      const isEmpty =
        result === null ||
        result === undefined ||
        (Array.isArray(result) && result.length === 0);
      const ttlMs = isEmpty ? 0 : resolveTtlMs ? resolveTtlMs(result) ?? customTtlMs : customTtlMs;
      // A delete() during the fetch means this result may predate the invalidating write.
      if (ttlMs !== 0 && (this.generations.get(key) ?? 0) === generation) {
        this.set(key, result, ttlMs);
      }
      return result;
    })();

    this.inFlightMap.set(key, promise);
    // Only clear our own entry; a delete() + newer fetch may already own this key.
    promise
      .finally(() => {
        if (this.inFlightMap.get(key) === promise) {
          this.inFlightMap.delete(key);
        }
      })
      .catch(() => {});
    return promise;
  }

  public clear(): void {
    this.cache.clear();
    this.inFlightMap.clear();
  }
}

export const globalCacheService = new CacheService();
