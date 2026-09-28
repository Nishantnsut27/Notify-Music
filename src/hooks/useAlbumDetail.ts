import { useEffect, useRef, useState } from 'react';
import { MusicAPI } from '../services/musicApi';
import type { Album } from '../types/types';

/**
 * One album and its tracks.
 *
 * `/api/albums` returns the full song list inline, so there is no paging here
 * and no second request — one lookup fills the whole page.
 */
export interface AlbumDetailState {
  album: Album | null;
  isLoading: boolean;
  error: string | null;
}

export function useAlbumDetail(albumId: string | null): AlbumDetailState {
  const [album, setAlbum] = useState<Album | null>(null);
  /* Loading from the first render: before the effect starts the request there
     is no album and no error, which would otherwise read as "not found". */
  const [isLoading, setIsLoading] = useState(Boolean(albumId));
  const [error, setError] = useState<string | null>(null);

  /* A stale response must not replace the album the listener is looking at now. */
  const sequenceRef = useRef(0);

  useEffect(() => {
    if (!albumId) {
      sequenceRef.current += 1;
      setAlbum(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++sequenceRef.current;
    // The previous album is not this one; keeping it would show it under the new id.
    setAlbum(null);
    setIsLoading(true);
    setError(null);

    MusicAPI.getAlbumById(albumId)
      .then((result) => {
        if (requestId !== sequenceRef.current) return;
        if (!result) {
          setAlbum(null);
          setError('This album could not be found.');
          return;
        }
        setAlbum(result);
      })
      .catch(() => {
        if (requestId !== sequenceRef.current) return;
        setAlbum(null);
        setError('This album could not be loaded.');
      })
      .finally(() => {
        if (requestId !== sequenceRef.current) return;
        setIsLoading(false);
      });
  }, [albumId]);

  return { album, isLoading, error };
}
