import { create } from 'zustand';
import { authApi, type UserProfile } from '../services/authApi';
import { ApiError } from '../services/apiClient';
import { getStoredToken, setStoredToken, removeStoredToken } from '../services/tokenStorage';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  login: (data: { email: string; password: string; rememberMe?: boolean }) => Promise<boolean>;
  signup: (data: { fullName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(credentials);
      if (response.token) {
        setStoredToken(response.token, credentials.rememberMe || false);
      }
      set({
        user: response.user,
        token: response.token || getStoredToken(),
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
        setStoredToken(response.token, true);
      }
      set({
        user: response.user,
        token: response.token || getStoredToken(),
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
      removeStoredToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
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
      import('./playerStore').then(({ usePlayerStore }) => {
        usePlayerStore.getState().syncCloudUserData();
      });
      return;
    } catch {
      removeStoredToken();
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: true,
    });
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
