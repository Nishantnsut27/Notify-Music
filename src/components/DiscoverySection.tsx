import { useState, useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import { MusicAPI } from '../services/musicApi';
import type { Track } from '../types/types';
import { TrackListModern } from './TrackListModern';

export function DiscoverySection() {
  const { recentlyPlayed } = usePlayerStore();
  const { isAuthenticated } = useAuthStore();
  const [recommendedArtists, setRecommendedArtists] = useState<Track[]>([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);

  const lastPlayedArtist = recentlyPlayed[0]?.artist_name;
  const lastPlayedId = recentlyPlayed[0]?.id;
  const lastPlayedGenre = recentlyPlayed[0]?.musicinfo?.tags?.genres?.[0];
  const lastPlayedLanguage = recentlyPlayed[0]?.language;
  const exploreTerm = lastPlayedGenre || lastPlayedLanguage;

  /* Keyed on the artist, not the whole history: every play rewrites
     recentlyPlayed, and another song by the same artist is the same shelf. */
  useEffect(() => {
    if (!lastPlayedArtist) return;
    let cancelled = false;
    setIsLoadingArtists(true);
    MusicAPI.getArtistTracks(lastPlayedArtist, 8)
      .then(tracks => {
        if (!cancelled) setRecommendedArtists(tracks);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingArtists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lastPlayedArtist]);

  const artistShelf = recommendedArtists.filter(t => t.id !== lastPlayedId).slice(0, 8);

  if (!isAuthenticated) return null;

  return (
    <div className="discovery-sections">
      {lastPlayedArtist && artistShelf.length > 0 && (
        <section className="home-section">
          <div className="section-header-row">
            <h2 className="section-title">Because You Listened To {lastPlayedArtist}...</h2>
          </div>
          <TrackListModern
            tracks={artistShelf}
            isLoading={isLoadingArtists}
            showAddToPlaylist
            queueContext={{
              kind: 'section',
              id: `because-you-listened:${lastPlayedArtist}`,
              name: `Because you listened to ${lastPlayedArtist}`,
            }}
          />
        </section>
      )}

      {exploreTerm && (
        <section className="home-section">
          <div className="section-header-row">
            <h2 className="section-title">Explore {exploreTerm}</h2>
          </div>
          <GenreExplorer genre={exploreTerm} />
        </section>
      )}
    </div>
  );
}

function GenreExplorer({ genre }: { genre: string }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    MusicAPI.getTracksByGenre(genre, 8)
      .then((result) => {
        if (!cancelled) setTracks(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [genre]);

  return (
    <TrackListModern
      tracks={tracks}
      isLoading={isLoading}
      showAddToPlaylist
      queueContext={{ kind: 'section', id: `genre:${genre}`, name: `Explore ${genre}` }}
    />
  );
}
