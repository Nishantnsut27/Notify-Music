import { useState, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore, type AppView } from '../store/playerStore';
import type { QueueContext, Track } from '../types/types';
import { TrackListModern } from './TrackListModern';
import { TrackCardGrid } from './TrackCardGrid';
import { ContentSection } from './ContentSection';
import { MusicAPI } from '../services/musicApi';
import { SearchBar } from './SearchBar';
import { CuratedSections } from './CuratedSections';

/** Both shelves on this page play through the list they show. */
const RECENT_CONTEXT: QueueContext = {
  kind: 'section',
  id: 'recently-played',
  name: 'Continue Listening',
};
const TRENDING_CONTEXT: QueueContext = {
  kind: 'section',
  id: 'home-trending',
  name: 'Trending & Recommended',
};

const TRENDING_PAGE_SIZE = 8;

interface QuickLink {
  view: AppView;
  label: string;
  hint: string;
  icon: ReactNode;
}

/** The three places a signed-in listener's own music lives. */
const QUICK_LINKS: QuickLink[] = [
  {
    view: 'favorites',
    label: 'Favorites',
    hint: 'Songs you saved',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    view: 'playlists',
    label: 'Playlists',
    hint: 'Collections you built',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="15" y2="13" />
      </svg>
    ),
  },
  {
    view: 'history',
    label: 'History',
    hint: 'Everything you played',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </svg>
    ),
  },
];

function getPersonalizedGreeting(): string {
  const baseMessages = [
    'Long time no see',
    'We are glad to see you back',
    'Ready to jam',
    'Welcome back to your vibe',
    'Good to see you again',
    'Let the music play',
  ];

  const hour = new Date().getHours();
  if (hour < 12) baseMessages.push('Good morning', 'Morning vibes', 'Start your day right');
  else if (hour < 18) baseMessages.push('Good afternoon', 'Afternoon chill');
  else baseMessages.push('Good evening', 'Evening unwinding', 'Late night tunes');

  return baseMessages[Math.floor(Math.random() * baseMessages.length)];
}

export function PersonalizedHome() {
  const { user } = useAuthStore();
  const { recentlyPlayed, setCurrentView } = usePlayerStore();

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [trendingPage, setTrendingPage] = useState(0);
  /* Trending's own flags. The store's isLoading/error belong to search, and
     sharing them let one surface's spinner or failure show up on the other. */
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  /* Chosen once, on mount. It used to re-roll every 15 seconds, which meant the
     heading changed under a listener who had not touched anything. */
  const [greeting] = useState(getPersonalizedGreeting);

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : '';

  const featuredTracks = trendingTracks.slice(0, (trendingPage + 1) * TRENDING_PAGE_SIZE);
  const hasMoreTracks = trendingTracks.length > (trendingPage + 1) * TRENDING_PAGE_SIZE;

  useEffect(() => {
    let cancelled = false;
    MusicAPI.getTrendingTracks()
      .then((res) => {
        if (!cancelled) setTrendingTracks(res);
      })
      .catch((err) => {
        console.error('Failed to load trending', err);
        if (!cancelled) {
          setTrendingError(err instanceof Error ? err.message : 'Trending music is temporarily unavailable.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsTrendingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="personalized-home">
      {/* Phones hide the header search, so this is the only way in on mobile. */}
      <div className="content-search-container">
        <SearchBar />
      </div>

      <header className="home-hero">
        <p className="t-eyebrow">Your Soundrift</p>
        <h1 className="t-h1 home-hero-greeting">
          {greeting}
          {firstName && <span className="home-hero-name">, {firstName}</span>}
        </h1>

        <nav className="home-quick-links" aria-label="Your library">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.view}
              type="button"
              className="home-quick-link"
              onClick={() => setCurrentView(link.view)}
            >
              <span className="home-quick-link-icon">{link.icon}</span>
              <span className="home-quick-link-text">
                <span className="home-quick-link-label">{link.label}</span>
                <span className="home-quick-link-hint t-micro">{link.hint}</span>
              </span>
            </button>
          ))}
        </nav>
      </header>

      {recentlyPlayed.length > 0 && (
        <ContentSection
          title="Continue Listening"
          subtitle="Pick up where you left off."
          action={{ label: 'See all', onClick: () => setCurrentView('history') }}
        >
          <TrackCardGrid
            tracks={recentlyPlayed.slice(0, 6)}
            singleRow
            queue={recentlyPlayed}
            queueContext={RECENT_CONTEXT}
          />
        </ContentSection>
      )}

      <CuratedSections />

      <section className="content-section">
        <header className="content-section-head">
          <div className="content-section-heading">
            <h2 className="t-h2 content-section-title">Trending &amp; Recommended</h2>
            <p className="t-meta content-section-subtitle">
              What the catalogue is playing most right now.
            </p>
          </div>
        </header>

        <div className="content-section-body">
          <TrackListModern
            tracks={featuredTracks}
            title=""
            isLoading={isTrendingLoading}
            error={trendingError}
            queueContext={TRENDING_CONTEXT}
          />

          {hasMoreTracks && (
            <div className="home-load-more">
              <button
                type="button"
                className="sr-btn sr-btn-outline"
                onClick={() => setTrendingPage((prev) => prev + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
                Load more
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
