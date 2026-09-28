import { useCallback, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { MusicAPI } from '../services/musicApi';
import { saveSearch } from '../services/searchHistory';
import { usePlayerStore } from '../store/playerStore';

/**
 * The one search engine.
 *
 * This is SearchBar's original logic moved, not rewritten: the same 300ms
 * useDebounce, the same AbortController, the same monotonic sequence guard that
 * makes a slow earlier response unable to overwrite a newer one. It moved because
 * a search field is rendered more than once (the mobile header, the search page,
 * the authenticated home) and each copy used to run its own engine, so one
 * `music-search` event fired two identical requests. There is now exactly one
 * subscriber, so that cannot happen.
 *
 * Call it once, from App.
 */
const SEARCH_PATH = '/search';

/**
 * How long a search-as-you-type query has to stay on screen before it counts as
 * a search the listener meant, rather than a fragment on the way to one.
 */
const HISTORY_SETTLE_MS = 2000;

const readQueryFromUrl = (): string =>
  (new URLSearchParams(window.location.search).get('q') || '').trim();

export function useSearchEngine() {
  const searchInput = usePlayerStore((state) => state.searchInput);
  const query = usePlayerStore((state) => state.query);
  const currentView = usePlayerStore((state) => state.currentView);
  const setSearchInput = usePlayerStore((state) => state.setSearchInput);
  const setCurrentView = usePlayerStore((state) => state.setCurrentView);
  const setResults = usePlayerStore((state) => state.setResults);
  const setLoading = usePlayerStore((state) => state.setLoading);
  const setError = usePlayerStore((state) => state.setError);
  const setQuery = usePlayerStore((state) => state.setQuery);

  /** The request in flight, or null once the newest one has settled. */
  const requestRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  /** The last query a request was started for, so the same search never runs twice. */
  const lastRunRef = useRef('');
  const saveTimerRef = useRef<number | null>(null);
  const debouncedInput = useDebounce(searchInput, 300);

  const cancelPendingSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelPendingSave, [cancelPendingSave]);

  /**
   * `save: 'now'` is an explicit request (submit, suggestion, retry) and is
   * recorded immediately; `'settled'` is typing and is recorded only if no newer
   * search replaces it within HISTORY_SETTLE_MS.
   */
  const performSearch = useCallback(
    async (value: string, save: 'now' | 'settled') => {
      const clean = value.trim();
      if (!clean) return;

      requestRef.current?.abort();
      cancelPendingSave();
      const controller = new AbortController();
      requestRef.current = controller;
      const requestId = ++sequenceRef.current;
      lastRunRef.current = clean;

      setLoading(true);
      setError(null);
      setQuery(clean);

      try {
        const tracks = await MusicAPI.searchTracks(clean, undefined, controller.signal);
        // A response that is no longer the newest (or whose search was cleared) is dropped, never rendered.
        if (controller.signal.aborted || requestId !== sequenceRef.current) return;
        setResults(tracks);
        if (save === 'now') {
          void saveSearch(clean).catch(() => {});
        } else {
          saveTimerRef.current = window.setTimeout(() => {
            saveTimerRef.current = null;
            if (requestId === sequenceRef.current) void saveSearch(clean).catch(() => {});
          }, HISTORY_SETTLE_MS);
        }
      } catch (error) {
        if (controller.signal.aborted || requestId !== sequenceRef.current) return;
        setResults([]);
        setError(error instanceof Error ? error.message : 'Search failed. Please try again.');
      } finally {
        if (requestId === sequenceRef.current) {
          requestRef.current = null;
          setLoading(false);
        }
      }
    },
    [cancelPendingSave, setError, setLoading, setQuery, setResults],
  );

  // Search-as-you-type, still only on the search view: typing in the header field
  // from another page navigates on submit rather than searching in the background.
  useEffect(() => {
    if (currentView !== 'search') {
      // Typing elsewhere raised the loading flag; nothing will run to clear it.
      if (!requestRef.current) setLoading(false);
      return;
    }

    // Wait for the debounce to catch up. Arriving here from another page puts a
    // new searchInput in the store while debouncedInput still holds the previous
    // one, and searching that would abort the search that was just requested.
    if (debouncedInput !== searchInput) return;

    const clean = debouncedInput.trim();
    if (!clean) {
      requestRef.current?.abort();
      requestRef.current = null;
      cancelPendingSave();
      lastRunRef.current = '';
      setLoading(false);
      return;
    }

    if (clean === lastRunRef.current) {
      if (!requestRef.current) setLoading(false);
      return;
    }
    void performSearch(clean, 'settled');
  }, [debouncedInput, searchInput, currentView, performSearch, setLoading, cancelPendingSave]);

  // Typing is itself a loading state. Without this the page would show its
  // "start typing" state for the length of the debounce before the skeletons,
  // which reads as a flicker back to empty.
  useEffect(() => {
    if (currentView !== 'search') return;
    const typed = searchInput.trim();
    if (typed && typed !== debouncedInput.trim() && typed !== lastRunRef.current) setLoading(true);
  }, [searchInput, debouncedInput, currentView, setLoading]);

  // Explicit search requests: submitting a field, picking a suggestion, following
  // an artist or album name, retrying after an error. These run immediately.
  useEffect(() => {
    const runRequestedSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (!value || !value.trim()) return;
      setSearchInput(value);
      if (usePlayerStore.getState().currentView !== 'search') setCurrentView('search');
      void performSearch(value, 'now');
    };

    window.addEventListener('music-search', runRequestedSearch);
    return () => window.removeEventListener('music-search', runRequestedSearch);
  }, [performSearch, setCurrentView, setSearchInput]);

  // URL -> query. Covers a reload on /search?q=... and Back into it: the query in
  // the address bar is what the page restores from.
  useEffect(() => {
    if (currentView !== 'search') return;

    const fromUrl = readQueryFromUrl();
    if (!fromUrl) return;
    if (usePlayerStore.getState().searchInput.trim() === fromUrl) return;
    setSearchInput(fromUrl);
  }, [currentView, setSearchInput]);

  // query -> URL, so the address bar always names the search whose results are on
  // screen: a reload or a shared link restores it.
  //
  // Driven by the committed query rather than the keystrokes, which keeps this to
  // one write per search — browsers rate-limit history writes — and means a reload
  // mid-word restores the last search that actually ran, not a half-typed word.
  //
  // Refining a search on /search replaces the entry: a keystroke is not a
  // destination, so Back leaves Search instead of walking back through every
  // letter typed. Arriving from another page pushes, so the page left behind stays
  // in history. This runs before App's view -> URL sync in the same commit, and
  // that sync then sees /search already in place and adds nothing.
  useEffect(() => {
    if (currentView !== 'search') return;

    const clean = query.trim();
    const target = clean ? `${SEARCH_PATH}?q=${encodeURIComponent(clean)}` : SEARCH_PATH;
    if (`${window.location.pathname}${window.location.search}` === target) return;

    try {
      if (window.location.pathname === SEARCH_PATH) window.history.replaceState(null, '', target);
      else window.history.pushState(null, '', target);
    } catch {
      // A blocked history write must not stop the search from working.
    }
  }, [query, currentView]);
}
