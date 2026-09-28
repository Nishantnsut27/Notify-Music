import { useCallback, useSyncExternalStore } from 'react';
import { MusicAPI } from '../services/musicApi';
import { usePlayerStore } from '../store/playerStore';
import { useToastStore } from '../store/toastStore';
import type { Track } from '../types/types';

/** The two things a card can play in one click. Not a listener's own playlist. */
export type CollectionKind = 'album' | 'playlist';

/* One pending request for the whole page, not one per card: every card has its
   own hook instance, and the newest click must win whichever card it came from. */
let pending: { token: number; kind: CollectionKind; id: string } | null = null;
let requestCounter = 0;
const pendingListeners = new Set<() => void>();

function setPending(next: typeof pending) {
  pending = next;
  pendingListeners.forEach((listener) => listener());
}

function subscribePending(listener: () => void) {
  pendingListeners.add(listener);
  return () => { pendingListeners.delete(listener); };
}

const getPendingId = () => pending?.id ?? null;

/**
 * Play a whole album or catalogue playlist from a card.
 *
 * A card only knows an id — the songs live behind a request — so pressing play
 * means fetching first. That gap is why `pendingId` exists: the card that was
 * pressed shows a spinner instead of the grid sitting silent for a second.
 *
 * Pressing play on the collection that is already loaded toggles it rather than
 * fetching it again, so a second click behaves like the player's own button.
 */
export function useCollectionPlayback() {
  const pendingId = useSyncExternalStore(subscribePending, getPendingId);

  const addToast = useToastStore((state) => state.addToast);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const pauseTrack = usePlayerStore((state) => state.pauseTrack);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queueContext = usePlayerStore((state) => state.queueContext);

  /** The collection currently loaded in the queue, if the queue is one at all.
      A section is not one: a card must not light up because a row of loose
      tracks happens to share its id. */
  const activeId =
    queueContext.kind === 'album' || queueContext.kind === 'playlist' ? queueContext.id : null;

  const playCollection = useCallback(
    async (kind: CollectionKind, id: string, name: string) => {
      if (!id) return;

      const current = usePlayerStore.getState().queueContext;
      if (current.kind === kind && current.id === id) {
        // Newer than any collection still loading, which is then dropped.
        if (pending) setPending(null);
        if (usePlayerStore.getState().isPlaying) pauseTrack();
        else setIsPlaying(true);
        return;
      }

      // Already the newest request: a second click must not fetch it twice.
      if (pending?.kind === kind && pending.id === id) return;
      const token = ++requestCounter;
      setPending({ token, kind, id });
      /* Anything the listener starts meanwhile — a song, another collection —
         bumps the session, and a response that lands after it is dropped. */
      const sessionAtClick = usePlayerStore.getState().sessionId;
      const isStale = () => pending?.token !== token || usePlayerStore.getState().sessionId !== sessionAtClick;

      try {
        let tracks: Track[] = [];
        if (kind === 'album') {
          const album = await MusicAPI.getAlbumById(id);
          tracks = album?.songs ?? album?.tracks ?? [];
        } else {
          const playlist = await MusicAPI.getPlaylistById(id);
          tracks = playlist?.tracks ?? [];
        }
        if (isStale()) return;

        // A row without a stream cannot be played past, so it never enters the
        // queue: Next would otherwise stall on it.
        const playable = tracks.filter((track) => Boolean(track?.audio));
        if (playable.length === 0) {
          addToast({
            type: 'error',
            title: kind === 'album' ? 'Album unavailable' : 'Playlist unavailable',
            message: `No playable songs in "${name}".`,
          });
          return;
        }

        playTrack(playable[0], playable, 0, { kind, id, name });
      } catch {
        if (isStale()) return;
        addToast({
          type: 'error',
          title: 'Could not start playback',
          message: `"${name}" could not be loaded.`,
        });
      } finally {
        if (pending?.token === token) setPending(null);
      }
    },
    [addToast, pauseTrack, playTrack, setIsPlaying],
  );

  return { playCollection, pendingId, activeId, isPlaying };
}
