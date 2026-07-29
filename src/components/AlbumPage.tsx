import { useState, useEffect, useMemo } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { MusicAPI } from '../services/musicApi';
import type { Track } from '../types/types';
import { TrackListModern } from './TrackListModern';
import { EmptyState } from './EmptyState';
import { ErrorDisplay } from './ErrorDisplay';
import { formatDuration } from '../utils/formatters';

export function AlbumPage() {
  const {
    currentAlbumId,
    currentAlbumName,
    albumPageData,
    setAlbumPageData,
    playTrack,
    navigateToArtist,
  } = usePlayerStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAlbumData = async () => {
      if (!currentAlbumName) return;
      setIsLoading(true);
      setError(null);
      try {
        let albumTracks: Track[];
        if (currentAlbumId && currentAlbumId !== currentAlbumName) {
          const albumData = await MusicAPI.getAlbumById(currentAlbumId);
          if (albumData && 'tracks' in albumData) {
            albumTracks = (albumData as unknown as { tracks: Track[] }).tracks || [];
          } else {
            albumTracks = await MusicAPI.getAlbumTracks(currentAlbumName);
          }
        } else {
          albumTracks = await MusicAPI.getAlbumTracks(currentAlbumName);
        }
        setTracks(albumTracks);
        const totalDuration = albumTracks.reduce((sum, t) => sum + (t.duration || 0), 0);
        setAlbumPageData({
          id: currentAlbumId || currentAlbumName || '',
          name: currentAlbumName || '',
          releasedate: albumPageData?.releasedate || '',
          artist_id: albumTracks[0]?.artist_id || '',
          artist_name: albumTracks[0]?.artist_name || '',
          image: albumTracks[0]?.album_image || albumTracks[0]?.image || '',
          songCount: albumTracks.length,
          duration: totalDuration,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load album');
      } finally {
        setIsLoading(false);
      }
    };

    loadAlbumData();
  }, [currentAlbumId, currentAlbumName, albumPageData, setAlbumPageData]);

  const totalDuration = useMemo(() => tracks.reduce((sum, t) => sum + (t.duration || 0), 0), [tracks]);

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks, 0);
    }
  };

  const handleShuffleAlbum = () => {
    if (tracks.length > 0) {
      const shuffled = [...tracks];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      playTrack(shuffled[0], shuffled, 0);
    }
  };

  if (isLoading) {
    return (
      <div className="view-container album-page">
        <div className="album-header-skeleton">
          <div className="skeleton-shimmer album-art-skeleton" />
          <div className="album-info-skeleton">
            <div className="skeleton-shimmer" style={{ height: 28, width: 250, marginBottom: 8, borderRadius: 4 }} />
            <div className="skeleton-shimmer" style={{ height: 16, width: 150, marginBottom: 8, borderRadius: 4 }} />
            <div className="skeleton-shimmer" style={{ height: 14, width: 100, borderRadius: 4 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-container">
        <ErrorDisplay title="Could not load album" message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const artistName = tracks[0]?.artist_name || '';

  return (
    <div className="view-container album-page">
      <div className="album-header">
        <div className="album-art-wrapper">
          {(albumPageData?.image || tracks[0]?.album_image) ? (
            <img
              src={albumPageData?.image || tracks[0]?.album_image || ''}
              alt={currentAlbumName || ''}
              className="album-art"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-album.svg'; }}
            />
          ) : (
            <div className="album-art-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
          )}
        </div>

        <div className="album-info">
          <span className="album-label">Album</span>
          <h1 className="album-name">{currentAlbumName}</h1>
          {artistName && (
            <button
              className="album-artist-link"
              onClick={() => navigateToArtist(tracks[0]?.artist_id || artistName, artistName)}
            >
              {artistName}
            </button>
          )}
          <div className="album-meta">
            <span>{tracks.length} songs</span>
            <span className="album-meta-dot">·</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>

          <div className="album-actions">
            <button className="btn btn-primary" onClick={handlePlayAlbum} disabled={tracks.length === 0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play
            </button>
            <button className="btn btn-ghost" onClick={handleShuffleAlbum} disabled={tracks.length === 0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              Shuffle
            </button>
          </div>
        </div>
      </div>

      {tracks.length > 0 ? (
        <TrackListModern tracks={tracks} showAddToPlaylist />
      ) : (
        <EmptyState
          icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="4" /></svg>}
          title="No tracks found"
          description="We couldn't find tracks for this album."
        />
      )}
    </div>
  );
}