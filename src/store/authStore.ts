import { create } from 'zustand';
import { authApi, type UserProfile } from '../services/authApi';
import { ApiError } from '../services/apiClient';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  login: (data: { email: string; password: string }) => Promise<boolean>;
  signup: (data: { fullName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const TOKEN_KEY = 'notify_auth_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
      }
      set({
        user: response.user,
        token: response.token || localStorage.getItem(TOKEN_KEY),
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      import('./playerStore').then(({ usePlayerStore }) => {
        usePlayerStore.getState().syncCloudUserData();
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Invalid email or password.';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  },

  signup: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(credentials);
      if (response.token) {
        localStorage.setItem(TOKEN_KEY, response.token);
      }
      set({
        user: response.user,
        token: response.token || localStorage.getItem(TOKEN_KEY),
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      import('./playerStore').then(({ usePlayerStore }) => {
        usePlayerStore.getState().syncCloudUserData();
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      // Clear personal user data from memory on logout
      import('./playerStore').then(({ usePlayerStore }) => {
        usePlayerStore.setState({
          favorites: [],
          playlists: [],
          recentlyPlayed: [],
          currentView: 'search',
        });
      });
    }
  },

  checkAuth: async () => {
    try {
      const response = await authApi.getCurrentUser();
      set({
        user: response.user,
        isAuthenticated: true,
        isInitialized: true,
        error: null,
      });
      // Dynamically import playerStore to prevent circular reference
      import('./playerStore').then(({ usePlayerStore }) => {
        usePlayerStore.getState().syncCloudUserData();
      });
      return;
    } catch {
      // Token invalid or unauthenticated session
      localStorage.removeItem(TOKEN_KEY);
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });
    // Clear user data if session invalid
    import('./playerStore').then(({ usePlayerStore }) => {
      usePlayerStore.setState({
        favorites: [],
        playlists: [],
        recentlyPlayed: [],
        currentView: 'search',
      });
    });
  },

  clearError: () => set({ error: null }),
}));
