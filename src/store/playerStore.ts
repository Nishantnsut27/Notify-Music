import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Track, Playlist, PlaylistTrack, PlayerState, SearchState } from '../types/types';
import { STORAGE_KEYS, PLAYER_DEFAULTS } from '../config/constants';
import { userApi } from '../services/userApi';
import { useAuthStore } from './authStore';

interface PlayerStore extends PlayerState {
  playTrack: (track: Track, queue?: Track[], index?: number) => void;
  pauseTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seekTo: (time: number) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
}

interface SearchStore extends SearchState {
 
  setQuery: (query: string) => void;
  setResults: (results: Track[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTrending: (trending: Track[]) => void;
  clearResults: () => void;
}

interface PlaylistStore {
  playlists: Playlist[];
  favorites: Track[];
  recentlyPlayed: Track[];
  listeningHistory: Track[];
  
  syncCloudUserData: () => Promise<void>;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  addToFavorites: (track: Track) => void;
  removeFromFavorites: (trackId: string) => void;
  clearFavorites: () => void;
  exportPlaylist: (id: string) => string;
  importPlaylist: (data: string) => void;
}

interface UIStore {
  isSidebarOpen: boolean;
  currentView: 'search' | 'playlists' | 'favorites' | 'recently-played' | 'history';
  theme: 'light' | 'dark';
  
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setCurrentView: (view: 'search' | 'playlists' | 'favorites' | 'recently-played' | 'history') => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

type AppStore = PlayerStore & SearchStore & PlaylistStore & UIStore;

const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToLocalStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

const getUniquePlaylistName = (baseName: string, existingPlaylists: Playlist[], excludeId?: string): string => {
  const existingNames = new Set(
    existingPlaylists
      .filter(p => p.id !== excludeId)
      .map(p => p.name.trim())
  );

  const trimmedBase = baseName.trim();
  if (!existingNames.has(trimmedBase)) {
    return trimmedBase;
  }

  let counter = 1;
  while (existingNames.has(`${trimmedBase} (${counter})`)) {
    counter++;
  }

  return `${trimmedBase} (${counter})`;
};

const areTracksIdentical = (tracksA: PlaylistTrack[] | Track[], tracksB: PlaylistTrack[] | Track[]): boolean => {
  if (tracksA.length !== tracksB.length) return false;
  const idsA = tracksA.map(t => String(t.id)).join(',');
  const idsB = tracksB.map(t => String(t.id)).join(',');
  return idsA === idsB;
};

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'default-playlist-1',
    name: 'Top Hits',
    tracks: [
      {
        id: 'demo-track-1',
        name: 'Midnight Groove',
        artist_name: 'Chill Lounge',
        artist_id: 'artist-1',
        album_name: 'Lo-Fi Sessions',
        album_id: 'album-1',
        album_image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
        audio: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        audiodownload: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        duration: 145,
        license_ccurl: '',
        musicinfo: { tags: { genres: ['Lofi', 'Chill'], instruments: [], vartags: [] } },
        addedAt: Date.now()
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

export const usePlayerStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: loadFromLocalStorage(STORAGE_KEYS.VOLUME, PLAYER_DEFAULTS.DEFAULT_VOLUME),
    isMuted: false,
    queue: [],
    currentIndex: -1,
    isShuffling: false,
    repeatMode: 'none',

    query: '',
    results: [],
    isLoading: false,
    error: null,
    trending: [],

    playlists: loadFromLocalStorage(STORAGE_KEYS.PLAYLISTS, DEFAULT_PLAYLISTS),
    favorites: loadFromLocalStorage(STORAGE_KEYS.FAVORITES, []),
    recentlyPlayed: [],
    listeningHistory: [],

    isSidebarOpen: false,
    currentView: 'search',
    theme: loadFromLocalStorage(STORAGE_KEYS.THEME, 'dark'),

    playTrack: (track: Track, queue?: Track[], index?: number) => {
      const state = get();
      const newQueue = queue || (state.queue.length > 0 ? state.queue : [track]);
      const newIndex = index !== undefined ? index : newQueue.findIndex(t => t.id === track.id);

      const updatedRecentlyPlayed = [track, ...state.recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 30);

      set({
        currentTrack: track,
        isPlaying: true,
        queue: newQueue,
        currentIndex: newIndex >= 0 ? newIndex : 0,
        currentTime: 0,
        duration: track.duration || 0,
        recentlyPlayed: updatedRecentlyPlayed,
        listeningHistory: [track, ...state.listeningHistory].slice(0, 50),
      });

      if (useAuthStore.getState().isAuthenticated) {
        userApi.addRecentlyPlayed(track).catch(() => {});
        userApi.recordHistory(track).catch(() => {});
      }
    },

    pauseTrack: () => set({ isPlaying: false }),

    nextTrack: () => {
      const state = get();
      if (state.queue.length === 0) return;

      let nextIndex = state.currentIndex + 1;
      
      if (state.isShuffling) {
        nextIndex = Math.floor(Math.random() * state.queue.length);
      } else if (nextIndex >= state.queue.length) {
        if (state.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }
      }

      const nextTrack = state.queue[nextIndex];
      if (nextTrack) {
        set({
          currentTrack: nextTrack,
          currentIndex: nextIndex,
          currentTime: 0,
          duration: nextTrack.duration || 0,
          isPlaying: true
        });
      }
    },

    previousTrack: () => {
      const state = get();
      if (state.queue.length === 0) return;

      let prevIndex = state.currentIndex - 1;
      
      if (prevIndex < 0) {
        if (state.repeatMode === 'all') {
          prevIndex = state.queue.length - 1;
        } else {
          return;
        }
      }

      const prevTrack = state.queue[prevIndex];
      if (prevTrack) {
        set({
          currentTrack: prevTrack,
          currentIndex: prevIndex,
          currentTime: 0,
          duration: prevTrack.duration || 0,
          isPlaying: true
        });
      }
    },

    setCurrentTime: (time: number) => set({ currentTime: time }),
    setDuration: (duration: number) => set({ duration }),
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    
    setVolume: (volume: number) => {
      const clamped = Math.max(0, Math.min(100, volume));
      set({ volume: clamped, isMuted: clamped === 0 });
      saveToLocalStorage(STORAGE_KEYS.VOLUME, clamped);
    },
    
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    seekTo: (time: number) => set({ currentTime: time }),
    
    toggleShuffle: () => set((state) => ({ isShuffling: !state.isShuffling })),
    
    setRepeatMode: (mode: 'none' | 'one' | 'all') => set({ repeatMode: mode }),

    addToQueue: (track: Track) => {
      const state = get();
      set({ queue: [...state.queue, track] });
    },

    removeFromQueue: (index: number) => {
      const state = get();
      const newQueue = state.queue.filter((_, i) => i !== index);
      let newCurrentIndex = state.currentIndex;
      
      if (index < state.currentIndex) {
        newCurrentIndex--;
      } else if (index === state.currentIndex) {
        newCurrentIndex = Math.min(newCurrentIndex, newQueue.length - 1);
      }
      
      set({ 
        queue: newQueue, 
        currentIndex: newCurrentIndex,
        currentTrack: newQueue[newCurrentIndex] || null
      });
    },

    clearQueue: () => set({ queue: [], currentIndex: -1, currentTrack: null, isPlaying: false }),

    setQuery: (query: string) => set({ query }),
    setResults: (results: Track[]) => set({ results }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),
    setTrending: (trending: Track[]) => set({ trending }),
    clearResults: () => set({ results: [], query: '', error: null }),

    syncCloudUserData: async () => {
      if (!useAuthStore.getState().isAuthenticated) return;
      try {
        const [cloudFavorites, cloudPlaylists, cloudRecentlyPlayed] = await Promise.all([
          userApi.getFavorites().catch(() => []),
          userApi.getPlaylists().catch(() => []),
          userApi.getRecentlyPlayed().catch(() => []),
        ]);
        if (cloudFavorites && cloudFavorites.length > 0) {
          set({ favorites: cloudFavorites });
          saveToLocalStorage(STORAGE_KEYS.FAVORITES, cloudFavorites);
        }
        if (cloudPlaylists && cloudPlaylists.length > 0) {
          set({ playlists: cloudPlaylists });
          saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, cloudPlaylists);
        }
        if (cloudRecentlyPlayed && cloudRecentlyPlayed.length > 0) {
          set({ recentlyPlayed: cloudRecentlyPlayed, listeningHistory: cloudRecentlyPlayed });
        }
      } catch (err) {
        console.error('Failed to sync cloud user data:', err);
      }
    },

    createPlaylist: (name: string) => {
      const state = get();
      const uniqueName = getUniquePlaylistName(name, state.playlists);
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: uniqueName,
        tracks: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const newPlaylists = [...state.playlists, newPlaylist];
      set({ playlists: newPlaylists });
      saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);

      if (useAuthStore.getState().isAuthenticated) {
        userApi.createPlaylist(uniqueName).then((remote) => {
          if (remote && remote.id) {
            const updated = get().playlists.map((p) => (p.id === newPlaylist.id ? { ...p, id: remote.id } : p));
            set({ playlists: updated });
            saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, updated);
          }
        }).catch(() => {});
      }

      return newPlaylist;
    },

    deletePlaylist: (id: string) => {
      const state = get();
      const newPlaylists = state.playlists.filter(p => p.id !== id);
      set({ playlists: newPlaylists });
      saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);

      if (useAuthStore.getState().isAuthenticated) {
        userApi.deletePlaylist(id).catch(() => {});
      }
    },

    renamePlaylist: (id: string, name: string) => {
      const state = get();
      const uniqueName = getUniquePlaylistName(name, state.playlists, id);
      const newPlaylists = state.playlists.map(p => 
        p.id === id ? { ...p, name: uniqueName, updatedAt: Date.now() } : p
      );
      set({ playlists: newPlaylists });
      saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);

      if (useAuthStore.getState().isAuthenticated) {
        userApi.updatePlaylist(id, { name: uniqueName }).catch(() => {});
      }
    },

    addTrackToPlaylist: (playlistId: string, track: Track) => {
      const state = get();
      const targetPlaylist = state.playlists.find(p => p.id === playlistId);
      if (targetPlaylist && targetPlaylist.tracks.some(t => t.id === track.id)) {
        return;
      }

      const playlistTrack: PlaylistTrack = {
        ...track,
        addedAt: Date.now()
      };
      
      const newPlaylists = state.playlists.map(p => 
        p.id === playlistId 
          ? { 
              ...p, 
              tracks: [...p.tracks, playlistTrack], 
              updatedAt: Date.now() 
            }
          : p
      );
      set({ playlists: newPlaylists });
      saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);

      if (useAuthStore.getState().isAuthenticated) {
        userApi.addTrackToPlaylist(playlistId, track).catch(() => {});
      }
    },

    removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
      const state = get();
      const newPlaylists = state.playlists.map(p => 
        p.id === playlistId 
          ? { 
              ...p, 
              tracks: p.tracks.filter(t => t.id !== trackId), 
              updatedAt: Date.now() 
            }
          : p
      );
      set({ playlists: newPlaylists });
      saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);

      if (useAuthStore.getState().isAuthenticated) {
        userApi.removeTrackFromPlaylist(playlistId, trackId).catch(() => {});
      }
    },

    addToFavorites: (track: Track) => {
      const state = get();
      if (!state.favorites.find(t => t.id === track.id)) {
        const newFavorites = [...state.favorites, track];
        set({ favorites: newFavorites });
        saveToLocalStorage(STORAGE_KEYS.FAVORITES, newFavorites);

        if (useAuthStore.getState().isAuthenticated) {
          userApi.addFavorite(track).catch(() => {});
        }
      }
    },

    removeFromFavorites: (trackId: string) => {
      const state = get();
      const newFavorites = state.favorites.filter(t => t.id !== trackId);
      set({ favorites: newFavorites });
      saveToLocalStorage(STORAGE_KEYS.FAVORITES, newFavorites);

      if (useAuthStore.getState().isAuthenticated) {
        userApi.removeFavorite(trackId).catch(() => {});
      }
    },

    clearFavorites: () => {
      set({ favorites: [] });
      saveToLocalStorage(STORAGE_KEYS.FAVORITES, []);
    },

    exportPlaylist: (id: string) => {
      const state = get();
      const playlist = state.playlists.find(p => p.id === id);
      return playlist ? JSON.stringify(playlist, null, 2) : '';
    },

    importPlaylist: (data: string) => {
      const playlist = JSON.parse(data);
      if (!playlist || typeof playlist !== 'object' || typeof playlist.name !== 'string' || !Array.isArray(playlist.tracks)) {
        throw new Error('Invalid playlist file structure');
      }
      const state = get();

      const hasExactSameTracks = state.playlists.some(p => areTracksIdentical(p.tracks, playlist.tracks));
      if (hasExactSameTracks) {
        throw new Error('Playlist already exists.');
      }

      const uniqueName = getUniquePlaylistName(playlist.name, state.playlists);
      const importedPlaylist: Playlist = {
        ...playlist,
        id: Date.now().toString(),
        name: uniqueName,
        createdAt: playlist.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      const newPlaylists = [...state.playlists, importedPlaylist];
      set({ playlists: newPlaylists });
      saveToLocalStorage(STORAGE_KEYS.PLAYLISTS, newPlaylists);
    },

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    setCurrentView: (view: 'search' | 'playlists' | 'favorites' | 'recently-played' | 'history') => set({ currentView: view }),
    
    setTheme: (theme: 'light' | 'dark') => {
      set({ theme });
      saveToLocalStorage(STORAGE_KEYS.THEME, theme);
    }
  }))
);
