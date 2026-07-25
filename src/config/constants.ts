export const API_BASE_URL = 'https://notify-music-player.onrender.com/api/music';

export const API_ENDPOINTS = {
  SEARCH: `${API_BASE_URL}/search`,
  TRENDING: `${API_BASE_URL}/trending`,
  SONG: (id: string) => `${API_BASE_URL}/song/${encodeURIComponent(id)}`,
  ARTIST: (id: string) => `${API_BASE_URL}/artist/${encodeURIComponent(id)}`,
} as const;

export const STORAGE_KEYS = {
  VOLUME: 'player-volume',
  PLAYLISTS: 'playlists',
  FAVORITES: 'favorites',
  THEME: 'theme',
} as const;

export const VIEWS = {
  SEARCH: 'search',
  PLAYLISTS: 'playlists',
  FAVORITES: 'favorites',
} as const;

export type ViewType = (typeof VIEWS)[keyof typeof VIEWS];

export const PLAYER_DEFAULTS = {
  DEFAULT_VOLUME: 80,
  SEARCH_DEBOUNCE_MS: 500,
  DEFAULT_SEARCH_LIMIT: 20,
  DEFAULT_TRENDING_LIMIT: 25,
} as const;
