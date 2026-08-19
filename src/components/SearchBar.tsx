import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { MusicAPI } from '../services/musicApi';
import { userApi, type SearchHistoryItem } from '../services/userApi';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import type { Track } from '../types/types';

const HISTORY_KEY = 'notify_recent_searches';
const HISTORY_LIMIT = 10;

type Suggestion = { label: string; kind: 'Song' | 'Artist' | 'Album'; track: Track };

const isMobileView = () => typeof window !== 'undefined' && window.innerWidth <= 768;

const readGuestHistory = (): SearchHistoryItem[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
};

const makeSuggestions = (tracks: Track[]): Suggestion[] => {
  const used = new Set<string>();
  const add = (label: string, kind: Suggestion['kind'], track: Track) => {
    const key = `${kind}:${label.toLowerCase()}`;
    if (!label || used.has(key)) return undefined;
    used.add(key);
    return { label, kind, track };
  };
  return tracks.flatMap(track => [add(track.name, 'Song', track), add(track.artist_name, 'Artist', track), add(track.album_name, 'Album', track)])
    .filter((item): item is Suggestion => Boolean(item)).slice(0, 7);
};

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const debouncedQuery = useDebounce(query, 300);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { setResults, setLoading, setError, clearResults, setQuery: setStoreQuery, currentView, setCurrentView } = usePlayerStore();

  const loadHistory = useCallback(async () => {
    const items = isAuthenticated ? await userApi.getSearchHistory().catch(() => []) : readGuestHistory();
    setHistory(items.slice(0, HISTORY_LIMIT));
  }, [isAuthenticated]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const saveHistory = useCallback(async (value: string) => {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    if (isAuthenticated) await userApi.addSearchHistory(clean).catch(() => {});
    else {
      const next = [{ query: clean, searchedAt: new Date().toISOString() }, ...readGuestHistory().filter(item => item.query.toLowerCase() !== clean.toLowerCase())].slice(0, HISTORY_LIMIT);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    }
    await loadHistory();
  }, [isAuthenticated, loadHistory]);

  const performSearch = useCallback(async (value: string, save = true) => {
    const clean = value.trim();
    if (!clean) { clearResults(); return; }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestId = ++sequenceRef.current;
    if (!isMobileView() && currentView !== 'search') setCurrentView('search');
    setIsSearching(true); setLoading(true); setError(null); setStoreQuery(clean);
    try {
      const tracks = await MusicAPI.searchTracks(clean, undefined, controller.signal);
      if (requestId !== sequenceRef.current) return;
      setResults(tracks);
      setSuggestions(makeSuggestions(tracks));
      if (save) await saveHistory(clean);
    } catch (error) {
      if (controller.signal.aborted || requestId !== sequenceRef.current) return;
      setResults([]);
      setError(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      if (requestId === sequenceRef.current) { setLoading(false); setIsSearching(false); }
    }
  }, [clearResults, saveHistory, setError, setLoading, setResults, setStoreQuery, currentView, setCurrentView]);

  useEffect(() => {
    if (currentView !== 'search') return;
    if (!debouncedQuery.trim()) {
      requestRef.current?.abort();
      setSuggestions([]);
      return;
    }
    void performSearch(debouncedQuery, true);
  }, [debouncedQuery, currentView, performSearch]);

  useEffect(() => {
    const runExternalSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (!value) return;
      if (isMobileView() && currentView !== 'search') return;
      setQuery(value); setIsOpen(false);
      if (!isMobileView() && currentView !== 'search') setCurrentView('search');
      void performSearch(value);
    };
    window.addEventListener('music-search', runExternalSearch);
    return () => window.removeEventListener('music-search', runExternalSearch);
  }, [performSearch, currentView, setCurrentView]);

  const selectQuery = (value: string) => {
    if (isMobileView() && currentView !== 'search') return;
    setQuery(value); setIsOpen(false); setActiveIndex(-1);
    if (!isMobileView() && currentView !== 'search') setCurrentView('search');
    void performSearch(value);
  };
  const clearHistory = async () => {
    if (isAuthenticated) await userApi.clearSearchHistory().catch(() => {}); else localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };
  const removeHistory = async (value: string) => {
    if (isAuthenticated) await userApi.removeSearchHistory(value).catch(() => {});
    else localStorage.setItem(HISTORY_KEY, JSON.stringify(readGuestHistory().filter(item => item.query !== value)));
    await loadHistory();
  };
  const dropdownItems = suggestions.length ? suggestions : history.map(item => ({ label: item.query, kind: 'Recent' as const, track: null }));

  return (
    <form className="search-bar-form" onSubmit={(event) => { event.preventDefault(); selectQuery(query); }}>
      <div className="search-bar-shell" ref={containerRef}>
        <div className="search-bar-container">
          <div className="search-bar-icon-badge" aria-hidden="true">
            {isSearching ? (
              <svg className="search-bar-loading-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="8" strokeOpacity="0.3" />
                <path d="M20 12a8 8 0 0 1-8 8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
          </div>
          <input value={query} onChange={event => { setQuery(event.target.value); setIsOpen(true); setActiveIndex(-1); }} onFocus={() => setIsOpen(true)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => Math.min(index + 1, dropdownItems.length - 1)); }
              else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => Math.max(index - 1, 0)); }
              else if (event.key === 'Enter' && activeIndex >= 0 && dropdownItems[activeIndex]) { event.preventDefault(); selectQuery(dropdownItems[activeIndex].label); }
              else if (event.key === 'Escape') { setIsOpen(false); event.currentTarget.blur(); }
              else if (event.key === 'Tab') setIsOpen(false);
            }} placeholder="Search songs, artists, albums…" className="search-bar-input" aria-label="Search songs, artists, albums, and playlists" aria-autocomplete="list" aria-expanded={isOpen && dropdownItems.length > 0} aria-controls="search-suggestions" autoComplete="off" />
          {query && <button type="button" onClick={() => { setQuery(''); clearResults(); setIsOpen(true); }} className="search-bar-clear-btn" aria-label="Clear search">×</button>}
        </div>
        {isOpen && dropdownItems.length > 0 && <div id="search-suggestions" className="search-suggestions" role="listbox" aria-label={suggestions.length ? 'Search suggestions' : 'Recent searches'}>
          {!suggestions.length && <div className="search-suggestions-heading"><span>Recent searches</span><button type="button" onClick={() => void clearHistory()}>Clear</button></div>}
          {dropdownItems.map((item, index) => <div key={`${item.kind}-${item.label}`} role="option" aria-selected={activeIndex === index} className={`search-suggestion ${activeIndex === index ? 'active' : ''}`} onMouseDown={event => { event.preventDefault(); selectQuery(item.label); }}>
            {item.track && <img src={item.track.image || item.track.album_image || '/Favicon.png'} alt="" />}
            <span><strong>{highlight(item.label, query)}</strong><small>{item.kind}</small></span>
            {item.kind === 'Recent' && <button type="button" aria-label={`Remove ${item.label} from recent searches`} onMouseDown={event => { event.stopPropagation(); event.preventDefault(); void removeHistory(item.label); }}>×</button>}
          </div>)}
        </div>}
      </div>
    </form>
  );
}

function highlight(value: string, query: string) {
  const index = value.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0 || !query.trim()) return value;
  return <>{value.slice(0, index)}<mark>{value.slice(index, index + query.trim().length)}</mark>{value.slice(index + query.trim().length)}</>;
}
