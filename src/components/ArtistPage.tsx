import { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { MusicAPI } from '../services/musicApi';
import type { Track, Album } from '../types/types';
import { TrackListModern } from './TrackListModern';
import { EmptyState } from './EmptyState';
import { ErrorDisplay } from './ErrorDisplay';
import { SkeletonTrackList } from './Skeletons';

export function ArtistPage() {
  const {
    currentArtistId,
    currentArtistName,
    artistPageData,
    setArtistPageData,
    playTrack,
  } = usePlayerStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArtistData = async () => {
      if (!currentArtistName) return;
      setIsLoading(true);
      setError(null);
      try {
        const [artistTracks] = await Promise.all([
          MusicAPI.getArtistTracks(currentArtistName, 30),
        ]);

        const uniqueAlbums: Album[] = [];
        const seenAlbums = new Set<string>();
        for (const t of artistTracks) {
          if (t.album_name && !seenAlbums.has(t.album_name.toLowerCase())) {
            seenAlbums.add(t.album_name.toLowerCase());
            uniqueAlbums.push({
              id: t.album_id || t.id,
              name: t.album_name,
              releasedate: '',
              artist_id: t.artist_id,
              artist_name: t.artist_name,
              image: t.album_image || t.image,
              songCount: 0,
            });
          }
        }

        setTracks(artistTracks);
        setAlbums(uniqueAlbums);
        setArtistPageData({
          id: currentArtistId || currentArtistName,
          name: currentArtistName,
          website: '',
          joindate: '',
          image: artistTracks[0]?.image || '',
          songCount: artistTracks.length,
          topTracks: artistTracks.slice(0, 10),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artist');
      } finally {
        setIsLoading(false);
      }
    };

    loadArtistData();
  }, [currentArtistId, currentArtistName, setArtistPageData]);

  if (isLoading) {
    return (
      <div className="view-container artist-page">
        <div className="artist-header-skeleton">
          <div className="skeleton-shimmer artist-image-skeleton" />
          <div className="artist-info-skeleton">
            <div className="skeleton-shimmer" style={{ height: 32, width: 200, marginBottom: 8, borderRadius: 4 }} />
            <div className="skeleton-shimmer" style={{ height: 16, width: 120, borderRadius: 4 }} />
          </div>
        </div>
        <SkeletonTrackList count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="view-container">
        <ErrorDisplay title="Could not load artist" message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const popularTracks = tracks.slice(0, 10);

  return (
    <div className="view-container artist-page">
      <div className="artist-header">
        <div className="artist-image-wrapper">
          {artistPageData?.image || tracks[0]?.image ? (
            <img
              src={artistPageData?.image || tracks[0]?.image || ''}
              alt={currentArtistName || ''}
              className="artist-image"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-album.svg'; }}
            />
          ) : (
            <div className="artist-image-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
        </div>
        <div className="artist-info">
          <span className="artist-label">Artist</span>
          <h1 className="artist-name">{currentArtistName}</h1>
          <p className="artist-track-count">{tracks.length} songs</p>
        </div>
      </div>

      {popularTracks.length > 0 && (
        <TrackListModern tracks={popularTracks} title="Popular Songs" showAddToPlaylist />
      )}

      {albums.length > 0 && (
        <section className="artist-albums-section">
          <h2 className="section-title">Albums</h2>
          <div className="artist-albums-grid">
            {albums.map((album, i) => (
              <div
                key={`${album.id}-${i}`}
                className="artist-album-card"
                onClick={() => {
                  const albumTracks = tracks.filter(t => t.album_name === album.name);
                  if (albumTracks.length > 0) {
                    playTrack(albumTracks[0], albumTracks, 0);
                  }
                }}
              >
                <div className="artist-album-cover">
                  <img src={album.image || '/placeholder-album.svg'} alt={album.name} loading="lazy" />
                  <div className="artist-album-overlay">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
                <div className="artist-album-info">
                  <h4 className="artist-album-name truncate">{album.name}</h4>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tracks.length === 0 && !isLoading && (
        <EmptyState
          icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 1v3m0 16v3M1 12h3m16 0h3" /></svg>}
          title="No tracks found"
          description="We couldn't find tracks for this artist. Try searching for a different artist."
        />
      )}
    </div>
  );
}