const CACHE_NAME = 'soundrift-audio-v1';
// Synthetic same-origin keys: they are only ever matched in Cache Storage and
// never requested, so the service worker cannot intercept or cache them.
const KEY_PATH = '/__soundrift-audio__/';
const SIZE_HEADER = 'x-soundrift-size';
const STORED_AT_HEADER = 'x-soundrift-stored-at';
const MAX_ENTRIES = 6;
const MAX_BYTES = 80 * 1024 * 1024;

interface CacheEntry {
  size: number;
  usedAt: number;
}

function requestFor(key: string): Request {
  return new Request(new URL(`${KEY_PATH}${encodeURIComponent(key)}`, window.location.origin).href);
}

function keyOf(request: Request): string {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith(KEY_PATH)) return '';
  try { return decodeURIComponent(pathname.slice(KEY_PATH.length)); } catch { return ''; }
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
}

/**
 * Complete audio files for upcoming songs, kept on the device.
 *
 * Cache Storage rather than IndexedDB: it stores the HTTP body as-is, reads it
 * back as a disk-backed Blob, needs no schema or transactions, and its quota
 * failures surface as a plain rejected put(). Metadata lives in the stored
 * response headers, so the index rebuilds from the cache alone after a reload.
 */
class AudioCache {
  private opening: Promise<Cache | null> | null = null;
  private readonly entries = new Map<string, CacheEntry>();
  private loaded = false;
  private writable = true;

  get isLoaded() { return this.loaded; }

  /** False without Cache Storage (insecure origin, private mode) or after quota ran out. */
  get isWritable() { return this.writable; }

  load(): Promise<Cache | null> {
    this.opening ??= this.open();
    return this.opening;
  }

  private async open(): Promise<Cache | null> {
    try {
      if (typeof caches === 'undefined') throw new Error('Cache Storage is unavailable.');
      const cache = await caches.open(CACHE_NAME);
      for (const request of await cache.keys()) {
        const key = keyOf(request);
        const response = key ? await cache.match(request) : undefined;
        if (!response) { await cache.delete(request); continue; }
        this.entries.set(key, {
          size: Number(response.headers.get(SIZE_HEADER)) || 0,
          usedAt: Number(response.headers.get(STORED_AT_HEADER)) || 0,
        });
      }
      return cache;
    } catch {
      this.writable = false;
      return null;
    } finally {
      this.loaded = true;
    }
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  async read(key: string): Promise<Blob | null> {
    const cache = await this.load();
    const entry = this.entries.get(key);
    if (!cache || !entry) return null;
    try {
      const blob = await (await cache.match(requestFor(key)))?.blob();
      if (blob?.size) {
        entry.usedAt = Date.now();
        return blob;
      }
    } catch {
      // Treated as a miss; the entry is dropped so it is downloaded again.
    }
    await this.remove(key);
    return null;
  }

  async write(key: string, blob: Blob, keep: ReadonlySet<string>): Promise<boolean> {
    const cache = await this.load();
    if (!cache || !this.writable || !(await this.makeRoom(blob.size, keep))) return false;
    const put = () => cache.put(requestFor(key), new Response(blob, {
      headers: {
        'Content-Type': blob.type,
        [SIZE_HEADER]: String(blob.size),
        [STORED_AT_HEADER]: String(Date.now()),
      },
    }));
    try {
      await put();
    } catch (error) {
      if (!isQuotaError(error)) return false;
      await this.evict(keep, () => true);
      try {
        await put();
      } catch {
        this.writable = false;
        return false;
      }
    }
    this.entries.set(key, { size: blob.size, usedAt: Date.now() });
    return true;
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
    try { await (await this.load())?.delete(requestFor(key)); } catch {
      // A missing or unreachable entry is already as good as removed.
    }
  }

  /** Drops songs well behind the listener, then the least recently used beyond the caps. */
  async prune(keep: ReadonlySet<string>, stale: ReadonlySet<string>): Promise<void> {
    if (!this.loaded) await this.load();
    await Promise.all([...stale].filter(key => !keep.has(key) && this.entries.has(key)).map(key => this.remove(key)));
    await this.makeRoom(0, keep);
  }

  /** Evicts until one more file of `size` bytes fits. False when kept files alone exceed the caps. */
  private async makeRoom(size: number, keep: ReadonlySet<string>): Promise<boolean> {
    const extra = size > 0 ? 1 : 0;
    const overLimit = () => {
      let bytes = size;
      for (const entry of this.entries.values()) bytes += entry.size;
      return this.entries.size + extra > MAX_ENTRIES || bytes > MAX_BYTES;
    };
    await this.evict(keep, overLimit);
    return !overLimit();
  }

  private async evict(keep: ReadonlySet<string>, shouldEvict: () => boolean): Promise<void> {
    const candidates = [...this.entries].filter(([key]) => !keep.has(key)).sort((a, b) => a[1].usedAt - b[1].usedAt);
    for (const [key] of candidates) {
      if (!shouldEvict()) return;
      await this.remove(key);
    }
  }
}

export const audioCache = new AudioCache();
