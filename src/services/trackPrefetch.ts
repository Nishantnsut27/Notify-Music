import type { Track } from '../types/types';
import { MusicAPI } from './musicApi';
import { audioCache } from './audioCache';

const MAX_TRACK_BYTES = 24 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120000;
const EXPIRED_STREAM_STATUSES = new Set([401, 403, 404, 410]);
const SUPPORTED_AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/aacp',
  'audio/ogg', 'application/ogg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/webm',
]);

export interface PreparedTrack {
  source: string;
  url: string;
  release: () => void;
}

export interface PrefetchPlan {
  current: Track | null;
  /** In play order, already limited to the lookahead. */
  upcoming: readonly Track[];
  history: readonly Track[];
  canDownload: boolean;
}

interface WantedTrack {
  key: string;
  track: Track;
}

class DownloadError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Audio download failed with status ${status}.`);
    this.status = status;
  }
}

const cacheKeys = new WeakMap<Track, string>();

function sourceOf(track: Track): string {
  const source = track.audio || track.audiodownload;
  if (!source) return '';
  try { return new URL(source, document.baseURI).href; } catch { return ''; }
}

function qualityOf(source: string): string {
  const url = new URL(source);
  return url.pathname.match(/_(\d{2,3})\.\w+$/)?.[1] || url.searchParams.get('format') || 'default';
}

/** Track id + quality, so a refreshed stream URL for the same file still hits. */
function cacheKeyOf(track: Track): string {
  let key = cacheKeys.get(track);
  if (key === undefined) {
    const source = sourceOf(track);
    key = /^https?:/.test(source) ? `${track.provider || 'default'}:${track.id}:${qualityOf(source)}` : '';
    cacheKeys.set(track, key);
  }
  return key;
}

function toPrepared(source: string, blob: Blob): PreparedTrack {
  const url = URL.createObjectURL(blob);
  let released = false;
  return { source, url, release: () => {
    if (!released) { released = true; URL.revokeObjectURL(url); }
  } };
}

async function downloadAudio(source: string, signal: AbortSignal): Promise<Blob> {
  // Direct CDN fetch: no API auth headers or cookies. A CORS refusal leaves the
  // normal HTMLAudioElement streaming path in place.
  const response = await fetch(source, { signal, mode: 'cors', credentials: 'omit' });
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const length = Number(response.headers.get('content-length'));
  if (response.status !== 200 || !response.body || !SUPPORTED_AUDIO_TYPES.has(type) || length > MAX_TRACK_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new DownloadError(response.status);
  }
  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_TRACK_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new DownloadError(response.status);
    }
    chunks.push(new Uint8Array(value));
  }
  if (!size) throw new DownloadError(response.status);
  return new Blob(chunks, { type });
}

/**
 * Downloads the songs that will play next onto the device while there is
 * network, and keeps the very next one as a ready object URL so the `ended`
 * handler can switch to it synchronously, with no request at the handoff.
 */
export class TrackPrefetcher {
  private signature = '';
  private wanted: WantedTrack[] = [];
  private keep: ReadonlySet<string> = new Set();
  private canDownload = false;
  private download: { key: string; controller: AbortController } | null = null;
  private ready: { key: string; prepared: PreparedTrack } | null = null;
  private readingKey = '';
  private readonly failed = new Set<string>();

  /** Cheap enough for every store update: real work only happens when the plan changes. */
  sync(plan: PrefetchPlan) {
    this.canDownload = plan.canDownload;
    const currentKey = plan.current ? cacheKeyOf(plan.current) : '';
    const wanted: WantedTrack[] = [];
    for (const track of plan.upcoming) {
      const key = cacheKeyOf(track);
      if (key && !wanted.some(entry => entry.key === key)) wanted.push({ key, track });
    }
    const signature = `${currentKey}|${wanted.map(entry => entry.key).join(',')}|${plan.history.length}`;
    if (signature !== this.signature) {
      this.signature = signature;
      this.wanted = wanted;
      const wantedKeys = new Set(wanted.map(entry => entry.key));
      if (this.download && !wantedKeys.has(this.download.key)) {
        this.download.controller.abort();
        this.download = null;
      }
      if (this.ready && this.ready.key !== wanted[0]?.key) this.releaseReady();
      for (const key of this.failed) if (!wantedKeys.has(key)) this.failed.delete(key);
      const recent = plan.history.slice(-2).map(cacheKeyOf);
      this.keep = new Set([currentKey, ...wantedKeys, ...recent].filter(Boolean));
      const stale = new Set(plan.history.slice(0, -2).map(cacheKeyOf));
      void audioCache.prune(this.keep, stale);
    }
    this.pump();
  }

  /** Hands the ready file to the player, which then owns (and releases) its URL. */
  take(track: Track): PreparedTrack | null {
    const ready = this.ready;
    if (!ready || ready.key !== cacheKeyOf(track)) return null;
    this.ready = null;
    return ready.prepared;
  }

  /** A stored file the media element could not decode must not be offered again. */
  discard(track: Track) {
    const key = cacheKeyOf(track);
    if (key) void audioCache.remove(key);
  }

  retryFailed() {
    this.failed.clear();
    this.pump();
  }

  clear() {
    this.signature = '';
    this.wanted = [];
    this.readingKey = '';
    this.download?.controller.abort();
    this.download = null;
    this.releaseReady();
  }

  private releaseReady() {
    this.ready?.prepared.release();
    this.ready = null;
  }

  private setReady(entry: WantedTrack, blob: Blob) {
    this.releaseReady();
    this.ready = { key: entry.key, prepared: toPrepared(sourceOf(entry.track), blob) };
  }

  private pump() {
    if (!audioCache.isLoaded) {
      if (this.wanted.length) void audioCache.load().then(() => this.pump());
      return;
    }
    const next = this.wanted[0];
    if (next && this.ready?.key !== next.key && this.readingKey !== next.key && audioCache.has(next.key)) {
      void this.readStored(next);
    }
    if (this.download || !this.canDownload) return;
    // Without on-device storage only the very next song can be held, in memory.
    const candidates = audioCache.isWritable ? this.wanted : this.wanted.slice(0, 1);
    const target = candidates.find(({ key }) => !audioCache.has(key) && this.ready?.key !== key && !this.failed.has(key));
    if (target) void this.fetchTrack(target);
  }

  private async readStored(entry: WantedTrack) {
    this.readingKey = entry.key;
    const blob = await audioCache.read(entry.key);
    if (this.readingKey !== entry.key) return;
    this.readingKey = '';
    if (!blob) this.pump();
    else if (this.wanted[0]?.key === entry.key && this.ready?.key !== entry.key) this.setReady(entry, blob);
  }

  private async fetchTrack(entry: WantedTrack) {
    const controller = new AbortController();
    this.download = { key: entry.key, controller };
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, DOWNLOAD_TIMEOUT_MS);
    try {
      let blob: Blob;
      try {
        blob = await downloadAudio(sourceOf(entry.track), controller.signal);
      } catch (error) {
        if (!(error instanceof DownloadError) || !EXPIRED_STREAM_STATUSES.has(error.status)) throw error;
        // Resolve a fresh stream URL now, while the network is available, rather
        // than through stream recovery at the handoff.
        const fresh = await MusicAPI.getTrackById(entry.track.id, controller.signal, { refresh: true });
        const refreshed = fresh ? sourceOf(fresh) : '';
        if (!refreshed || refreshed === sourceOf(entry.track)) throw error;
        blob = await downloadAudio(refreshed, controller.signal);
      }
      if (this.download?.controller !== controller) return;
      const stored = await audioCache.write(entry.key, blob, this.keep);
      if (this.wanted[0]?.key === entry.key) this.setReady(entry, blob);
      else if (!stored) this.failed.add(entry.key);
    } catch {
      // Prefetch must never change the selected track, show a playback error, or
      // block the normal stream. A failed song is retried on reconnect or return.
      if (timedOut || !controller.signal.aborted) this.failed.add(entry.key);
    } finally {
      clearTimeout(timer);
      if (this.download?.controller === controller) {
        this.download = null;
        this.pump();
      }
    }
  }
}
