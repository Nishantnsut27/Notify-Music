import type { Track } from '../types/types';

const CACHE_NAME = 'soundrift-offline-v1';
const STORAGE_PREFIX = 'soundrift-offline-library-v1:';
const MAX_TRACK_BYTES = 24 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120000;

const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/aacp',
  'audio/ogg','application/ogg','audio/wav','audio/x-wav','audio/flac','audio/webm',
]);

export interface OfflineTrackRecord {
  track: Track;
  savedAt: number;
  size: number;
}

export interface OfflineDownloadProgress {
  loaded: number;
  total: number | null;
}

let activeOwner = '';
let records: OfflineTrackRecord[] = [];
let cachePromise: Promise<Cache | null> | null = null;

function ownerId(): string {
  return 'device';
}
function storageKey(owner: string): string { return `${STORAGE_PREFIX}${owner}`; }
function requestFor(track: Track): Request {
  const owner = activeOwner || 'anonymous';
  const key = `${owner}:${track.provider || 'default'}:${track.id}`;
  return new Request(new URL(`/__soundrift-offline__/${encodeURIComponent(key)}`, window.location.origin).href);
}
function hydrate(): void {
  const owner = ownerId() || '';
  if (owner === activeOwner) return;
  activeOwner = owner;
  records = [];
  if (!owner) return;
  try {
    const raw = localStorage.getItem(storageKey(owner));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    if (Array.isArray(parsed)) {
      records = parsed.filter((item): item is OfflineTrackRecord =>
        !!item && typeof item === 'object'
        && typeof (item as OfflineTrackRecord).savedAt === 'number'
        && typeof (item as OfflineTrackRecord).size === 'number'
        && !!(item as OfflineTrackRecord).track
        && typeof (item as OfflineTrackRecord).track.id === 'string'
      );
    }
  } catch { records = []; }
}
function persist(): void {
  if (!activeOwner) return;
  try { localStorage.setItem(storageKey(activeOwner), JSON.stringify(records)); } catch { /* best effort */ }
}
async function openCache(): Promise<Cache | null> {
  if (cachePromise) return cachePromise;
  cachePromise = typeof caches === 'undefined' ? Promise.resolve(null) : caches.open(CACHE_NAME).catch(() => null);
  return cachePromise;
}
function findRecord(track: Track): OfflineTrackRecord | undefined {
  hydrate();
  return records.find((record) =>
    String(record.track.id) === String(track.id)
    && (record.track.provider || 'default') === (track.provider || 'default')
  );
}
async function fetchAudio(source: string, signal: AbortSignal, onProgress?: (progress: OfflineDownloadProgress) => void): Promise<Blob> {
  const response = await fetch(source, { signal, mode: 'cors', credentials: 'omit' });
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const length = Number(response.headers.get('content-length'));
  const total = Number.isFinite(length) && length > 0 ? length : null;
  if (response.status !== 200 || !response.body || !SUPPORTED_AUDIO_TYPES.has(type)
    || (total !== null && total > MAX_TRACK_BYTES)) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(response.status === 200 ? 'This audio source cannot be saved offline.' : `Audio download failed with status ${response.status}.`);
  }
  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  onProgress?.({ loaded: 0, total });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    if (loaded > MAX_TRACK_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error('This track is too large to save offline.');
    }
    chunks.push(new Uint8Array(value));
    onProgress?.({ loaded, total });
  }
  if (!loaded) throw new Error('The audio source returned an empty file.');
  return new Blob(chunks, { type });
}
export async function isOfflineSaved(track: Track): Promise<boolean> {
  const record = findRecord(track);
  if (!record) return false;
  const cache = await openCache();
  return Boolean(cache && await cache.match(requestFor(track)));
}
export async function getOfflineBlob(track: Track): Promise<Blob | null> {
  const record = findRecord(track);
  if (!record) return null;
  const cache = await openCache();
  if (!cache) return null;
  try {
    const response = await cache.match(requestFor(track));
    if (!response) {
      records = records.filter((item) => item !== record);
      persist();
      return null;
    }
    return await response.blob();
  } catch { return null; }
}
export async function getOfflineTracks(): Promise<Track[]> {
  hydrate();
  const cache = await openCache();
  if (!cache) return [];
  const valid: OfflineTrackRecord[] = [];
  for (const record of records) {
    if (await cache.match(requestFor(record.track))) valid.push(record);
  }
  if (valid.length !== records.length) {
    records = valid;
    persist();
  }
  return [...valid].sort((a,b) => b.savedAt - a.savedAt).map((record) => record.track);
}
export async function getOfflineStorageStats() {
  hydrate();
  await getOfflineTracks();
  return {
    count: records.length,
    bytes: records.reduce((sum, record) => sum + record.size, 0),
    maxBytes: MAX_TRACK_BYTES * 20,
  };
}
export async function saveOfflineTrack(track: Track, onProgress?: (progress: OfflineDownloadProgress) => void): Promise<void> {
  hydrate();
  if (findRecord(track) && await isOfflineSaved(track)) return;
  const source = track.audio || track.audiodownload;
  if (!source) throw new Error('This track does not have a playable audio source.');
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const cache = await openCache();
  try {
    if (!cache) throw new Error('Offline storage is unavailable in this browser.');
    const blob = await fetchAudio(source, controller.signal, onProgress);
    await cache.put(requestFor(track), new Response(blob, { headers: { 'Content-Type': blob.type } }));
    records = [
      { track, savedAt: Date.now(), size: blob.size },
      ...records.filter((item) =>
        String(item.track.id) !== String(track.id)
        || (item.track.provider || 'default') !== (track.provider || 'default')
      ),
    ];
    persist();
    window.dispatchEvent(new Event('soundrift-offline-library-changed'));
  } catch (error) {
    try { await cache?.delete(requestFor(track)); } catch { /* cleanup best effort */ }
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Offline save timed out. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
export async function removeOfflineTrack(track: Track): Promise<void> {
  hydrate();
  const cache = await openCache();
  try { await cache?.delete(requestFor(track)); } catch { /* best effort */ }
  records = records.filter((item) =>
    String(item.track.id) !== String(track.id)
    || (item.track.provider || 'default') !== (track.provider || 'default')
  );
  persist();
  window.dispatchEvent(new Event('soundrift-offline-library-changed'));
}
export async function clearOfflineTracks(): Promise<void> {
  hydrate();
  const cache = await openCache();
  if (cache) for (const record of records) {
    try { await cache.delete(requestFor(record.track)); } catch { /* best effort */ }
  }
  records = [];
  persist();
  window.dispatchEvent(new Event('soundrift-offline-library-changed'));
}
