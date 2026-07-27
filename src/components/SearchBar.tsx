import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { usePlayerStore } from '../store/playerStore';
import { MusicAPI } from '../services/musicApi';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 500);
  const { 
    setResults, 
    setLoading, 
    setError, 
    clearResults,
    setQuery: setStoreQuery,
  } = usePlayerStore();

  const performSearch = useCallback(async (searchQuery: string) => {
    setIsSearching(true);
    setLoading(true);
    setError(null);
    setStoreQuery(searchQuery);
    
    try {
      const tracks = await MusicAPI.searchTracks(searchQuery);
      setResults(tracks);
      setError(null);
    } catch (error) {
      console.error('🔍 Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 
        `Sorry, we couldn't find matches for "${searchQuery}". Try searching for popular songs, artists, or genres like rap, electronic, jazz, or pop.`;
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [setIsSearching, setLoading, setError, setStoreQuery, setResults]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery);
    } else {
      clearResults();
      setIsSearching(false);
    }
  }, [debouncedQuery, clearResults, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
    } else {
      setError("Please enter a song name, artist, or genre to search.");
      clearResults();
    }
  };

  const handleClear = () => {
    setQuery('');
    clearResults();
    setIsSearching(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (!value.trim()) {
      clearResults();
      setIsSearching(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="search-bar-form"
    >
      <div className="search-bar-container">
        <div className="search-bar-icon-badge">
          {isSearching ? (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none"
              stroke="white" 
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3">
                <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="12" cy="12" r="1"/>
            </svg>
          ) : (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          )}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search song, artist..."
          className="search-bar-input"
          aria-label="Search for music"
          autoComplete="off"
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="search-bar-clear-btn"
            aria-label="Clear search"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 9l-6 6"/>
              <path d="M9 9l6 6"/>
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
