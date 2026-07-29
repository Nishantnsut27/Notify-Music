export const BACKEND_URL = (import.meta.env as Record<string, string | undefined>).VITE_API_URL || 'http://localhost:5000';
export const API_BASE_URL = `${BACKEND_URL}/api/music`;

export const API_ENDPOINTS = {
  SEARCH: `${API_BASE_URL}/search`,
  TRENDING: `${API_BASE_URL}/trending`,
  SONG: (id: string) => `${API_BASE_URL}/song/${encodeURIComponent(id)}`,
  ALBUM: (id: string) => `${API_BASE_URL}/album/${encodeURIComponent(id)}`,
  ARTIST: (id: string) => `${API_BASE_URL}/artist/${encodeURIComponent(id)}`,
  SUGGESTIONS: (id: string) => `${API_BASE_URL}/suggestions/${encodeURIComponent(id)}`,
} as const;

export const STORAGE_KEYS = {
  VOLUME: 'player-volume',
  PLAYLISTS: 'playlists',
  FAVORITES: 'favorites',
  THEME: 'theme',
  PLAYBACK: 'notify-playback-state',
  REPEAT_MODE: 'notify-repeat-mode',
  SHUFFLE: 'notify-shuffle',
} as const;

export const VIEWS = {
  SEARCH: 'search',
  PLAYLISTS: 'playlists',
  FAVORITES: 'favorites',
  RECENTLY_PLAYED: 'recent',
  ARTIST: 'artist',
  ALBUM: 'album',
} as const;

export type ViewType = (typeof VIEWS)[keyof typeof VIEWS];

export const PLAYER_DEFAULTS = {
  DEFAULT_VOLUME: 80,
  SEARCH_DEBOUNCE_MS: 500,
  DEFAULT_SEARCH_LIMIT: 20,
  DEFAULT_TRENDING_LIMIT: 25,
} as const;
