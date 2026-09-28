const RETRY_KEY = 'soundrift_chunk_reload';
const RETRY_MARKER = '#soundrift_chunk_reload=';
const RETRY_MARKER_PATTERN = /#soundrift_chunk_reload=(\d+)/g;

/**
 * A chunk that fails again this soon after the reload it triggered is broken,
 * not stale. Other chunks loading fine in between prove nothing about it, so a
 * success elsewhere never re-arms the reload.
 */
const RETRY_WINDOW_MS = 30_000;

/** When the last chunk-recovery reload happened, or 0 if none is on record. */
function lastReloadAt(): number {
  try {
    const stored = Number(sessionStorage.getItem(RETRY_KEY));
    if (stored > 0) return stored;
  } catch {
    /* Storage is blocked, so the marker below is the only record of a retry. */
  }
  try {
    const matches = [...window.name.matchAll(RETRY_MARKER_PATTERN)];
    return matches.length > 0 ? Number(matches[matches.length - 1][1]) : 0;
  } catch {
    return 0;
  }
}

/**
 * Records the reload and reports whether that record will survive it. A mark
 * that cannot be read back would reload forever, so the caller treats a false
 * here as "cannot recover" and surfaces the original error instead.
 */
function markReload(at: number): boolean {
  const value = String(at);
  try {
    sessionStorage.setItem(RETRY_KEY, value);
    if (sessionStorage.getItem(RETRY_KEY) === value) return true;
  } catch {
    /* Private modes and storage-partitioned frames throw here; fall through. */
  }
  try {
    window.name = window.name.replace(RETRY_MARKER_PATTERN, '') + RETRY_MARKER + value;
    return window.name.includes(RETRY_MARKER + value);
  } catch {
    return false;
  }
}

/**
 * Wraps a route's dynamic import so that a deploy landing mid-session does not
 * strand the listener.
 *
 * The service worker registers with `autoUpdate`, so a new build activates and
 * clears the old precache while the page still holds the previous chunk names.
 * The next route change then asks for a file that no longer exists. One reload
 * picks up the new index and its new hashes; the timestamp makes it one reload
 * and not a loop, so a chunk that is genuinely broken still surfaces as an error.
 *
 * The timestamp has to outlive the reload it triggers. `sessionStorage` is the
 * natural home, but it throws outright in private modes and in frames whose
 * storage is partitioned, so `window.name` backs it up: same tab-scoped
 * lifetime, preserved across a same-origin reload, and unused elsewhere here.
 */
export function withChunkReload<T>(load: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await load();
    } catch (error) {
      const now = Date.now();
      if (now - lastReloadAt() < RETRY_WINDOW_MS || !markReload(now)) throw error;
      window.location.reload();
      return new Promise<T>(() => {});
    }
  };
}
