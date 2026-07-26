import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../types/types';
import { TrackListModern } from './TrackListModern';
import { MusicAPI } from '../services/musicApi';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const DEFAULT_POPULAR_ARTISTS = [
  { name: 'Arijit Singh', query: 'Arijit Singh' },
  { name: 'Taylor Swift', query: 'Taylor Swift' },
  { name: 'Karan Aujla', query: 'Karan Aujla' },
  { name: 'Drake', query: 'Drake' },
  { name: 'Shreya Ghoshal', query: 'Shreya Ghoshal' },
  { name: 'The Weeknd', query: 'The Weeknd' },
];

export function PersonalizedHome() {
  const { user } = useAuthStore();
  const {
    favorites,
    playlists,
    recentlyPlayed,
    playTrack,
    setCurrentView,
    results,
    queue,
    setQuery,
    setResults,
    setLoading,
    setError,
  } = usePlayerStore();

  const [artistsData, setArtistsData] = useState<Array<{ name: string; query: string; image?: string }>>(
    DEFAULT_POPULAR_ARTISTS
  );
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);

  const greeting = getTimeGreeting();
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Music Lover';

  // Compute trending / fallback tracks to feature
  const featuredTracks =
    results.length > 0
      ? results.slice(0, 8)
      : trendingTracks.length > 0
      ? trendingTracks.slice(0, 8)
      : queue.slice(0, 8);

  // Fetch trending tracks and real artwork for popular artists directly from backend API
  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      // 1. Fetch Trending Songs
      try {
        const trending = await MusicAPI.getTrendingTracks();
        if (isMounted && trending && trending.length > 0) {
          setTrendingTracks(trending);
        }
      } catch (err) {
        console.warn('[PersonalizedHome] Failed to load trending tracks:', err);
      }

      // 2. Fetch Artist Images
      const updated = await Promise.all(
        DEFAULT_POPULAR_ARTISTS.map(async (artist) => {
          try {
            const tracks = await MusicAPI.searchTracks(artist.query);
            if (tracks && tracks.length > 0) {
              return {
                ...artist,
                image: tracks[0].image || tracks[0].album_image,
              };
            }
          } catch (err) {
            console.warn(`[PersonalizedHome] Failed to load image for artist: ${artist.name}`);
          }
          return artist;
        })
      );

      if (isMounted) {
        setArtistsData(updated);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePlayFavorites = () => {
    if (favorites.length > 0) {
      playTrack(favorites[0], favorites);
    }
  };

  const handlePlayPlaylist = (playlistId: string) => {
    const pl = playlists.find((p) => p.id === playlistId);
    if (pl && pl.tracks.length > 0) {
      playTrack(pl.tracks[0], pl.tracks);
    }
  };

  const handleArtistClick = async (artistQuery: string) => {
    setQuery(artistQuery);
    setLoading(true);
    setError(null);
    setCurrentView('search');
    try {
      const tracks = await MusicAPI.searchTracks(artistQuery);
      setResults(tracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artist tracks.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="personalized-home">
      {/* Header Hero Banner */}
      <div className="home-hero-banner">
        <div className="home-hero-user">
          <div className="home-avatar-circle">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="home-avatar-img" />
            ) : (
              <div className="home-avatar-fallback">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <span className="home-hero-subtitle">PERSONALIZED DASHBOARD</span>
            <h1 className="home-hero-title">
              {greeting}, <span className="highlight-name">{firstName}</span>
            </h1>
          </div>
        </div>

        {/* Quick Action Pills */}
        <div className="home-quick-pills">
          <button onClick={() => setCurrentView('favorites')} className="pill-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Liked Songs ({favorites.length})
          </button>
          <button onClick={() => setCurrentView('playlists')} className="pill-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="9" />
              <line x1="9" y1="13" x2="15" y2="13" />
            </svg>
            Playlists ({playlists.length})
          </button>
          <button onClick={() => setCurrentView('recently-played')} className="pill-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Recently Played ({recentlyPlayed.length})
          </button>
        </div>
      </div>

      {/* Grid Highlights Section */}
      <div className="home-grid-highlights">
        {/* Liked Songs Hero Feature Card */}
        <div className="featured-card liked-songs-card" onClick={() => setCurrentView('favorites')}>
          <div className="card-bg-gradient" />
          <div className="card-content">
            <div className="heart-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <h3 className="card-title">Liked Songs</h3>
              <p className="card-sub">{favorites.length} saved favorite tracks</p>
            </div>
          </div>
          {favorites.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayFavorites();
              }}
              className="quick-play-btn"
              title="Play Liked Songs"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}
        </div>

        {/* Custom Playlists Quick Cards */}
        {playlists.slice(0, 3).map((pl) => (
          <div key={pl.id} className="featured-card playlist-card" onClick={() => setCurrentView('playlists')}>
            <div className="playlist-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div className="truncate">
              <h3 className="card-title truncate">{pl.name}</h3>
              <p className="card-sub">{pl.tracks.length} songs</p>
            </div>
            {pl.tracks.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPlaylist(pl.id);
                }}
                className="quick-play-btn"
                title={`Play ${pl.name}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Continue Listening / Recently Played Carousel Shelf */}
      {recentlyPlayed.length > 0 && (
        <section className="home-section">
          <div className="section-header-row">
            <h2 className="section-title">Continue Listening</h2>
            <button onClick={() => setCurrentView('recently-played')} className="see-all-btn">
              See All ({recentlyPlayed.length})
            </button>
          </div>
          <div className="recent-tracks-grid">
            {recentlyPlayed.slice(0, 6).map((track: Track) => (
              <div key={track.id} className="recent-track-card" onClick={() => playTrack(track, recentlyPlayed)}>
                <div className="track-cover-wrapper">
                  <img
                    src={track.image || track.album_image || '/Favicon.png'}
                    alt={track.name}
                    className="track-cover-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/Favicon.png';
                    }}
                  />
                  <div className="cover-overlay">
                    <button className="play-overlay-btn" title="Play">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="track-info">
                  <p className="track-title truncate">{track.name}</p>
                  <p className="track-artist truncate">{track.artist_name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Popular Artists Shelf with Dynamic Backend Image Loading */}
      <section className="home-section">
        <div className="section-header-row">
          <h2 className="section-title">Popular Artists</h2>
        </div>
        <div className="artists-row-grid">
          {artistsData.map((artist) => (
            <div
              key={artist.name}
              className="artist-card-circle"
              onClick={() => handleArtistClick(artist.query)}
              title={`Explore ${artist.name}`}
            >
              <div className="artist-img-wrapper">
                {artist.image ? (
                  <img
                    src={artist.image}
                    alt={artist.name}
                    className="artist-img"
                  />
                ) : (
                  <div className="artist-img-fallback">
                    {artist.name.charAt(0)}
                  </div>
                )}
              </div>
              <p className="artist-name truncate">{artist.name}</p>
              <span className="artist-tag">Artist</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trending & Recommended Shelf */}
      <section className="home-section">
        <div className="section-header-row">
          <h2 className="section-title">Trending & Recommended</h2>
          <button onClick={() => setCurrentView('search')} className="see-all-btn">
            Explore All
          </button>
        </div>
        <TrackListModern tracks={featuredTracks} title="" />
      </section>
    </div>
  );
}
