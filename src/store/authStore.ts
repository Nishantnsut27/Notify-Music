import { create } from 'zustand';
import { authApi, type UserProfile } from '../services/authApi';
import { ApiError } from '../services/apiClient';
import { getStoredToken, setStoredToken, removeStoredToken, getLibraryOwner } from '../services/tokenStorage';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;

  login: (data: { email: string; password: string; rememberMe?: boolean }) => Promise<boolean>;
  signup: (data: { fullName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  completeOAuth: () => Promise<{ status: 'success' | 'error' | 'none'; reason?: string }>;
  clearError: () => void;
}

/* Bumped by every explicit sign-in or sign-out, so a session check that was
   already in flight cannot overwrite the outcome the user just chose. */
let authGeneration = 0;

const AUTH_RETRY_DELAYS_MS = [5_000, 15_000, 45_000];
let authRetryAttempt = 0;
let authRetryTimer: ReturnType<typeof setTimeout> | null = null;

function syncLibrary(): void {
  import('./playerStore').then(({ usePlayerStore }) => {
    usePlayerStore.getState().syncCloudUserData();
  });
}

/** The one way a signed-in account's library leaves the device. */
function clearSignedInLibrary(): Promise<void> {
  return import('./playerStore').then(({ usePlayerStore }) => {
    usePlayerStore.getState().clearUserLibrary();
  });
}

/** Whether this device holds anything of a signed-in account worth clearing or re-checking. */
function hasSessionTrace(): boolean {
  return getStoredToken() !== null || getLibraryOwner() !== null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,
  errorCode: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null, errorCode: null });
    try {
      const response = await authApi.login(credentials);
      authGeneration += 1;
      if (response.token) {
        setStoredToken(response.token, credentials.rememberMe || false);
      }
      set({
        user: response.user,
        token: response.token || getStoredToken(),
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
      syncLibrary();
      return true;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Invalid email or password.';
      const errorCode = err instanceof ApiError ? (err.details as { code?: string } | null)?.code ?? null : null;
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        errorCode,
      });
      return false;
    }
  },

  signup: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(credentials);
      authGeneration += 1;
      if (response.token) {
        setStoredToken(response.token, true);
      }
      set({
        user: response.user,
        token: response.token || getStoredToken(),
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
      syncLibrary();
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
    authGeneration += 1;
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      /* The server may already have dropped the session; local sign-out still proceeds. */
    } finally {
      removeStoredToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      clearSignedInLibrary();
      import('./playerStore').then(({ usePlayerStore }) => {
        const store = usePlayerStore.getState();
        store.clearResults();
        store.stopPlayback();
        store.clearRecommendations();
        usePlayerStore.setState({
          query: '',
          isLoading: false,
          error: null,
          currentView: 'search',
          relatedMusic: null,
        });
        sessionStorage.removeItem('player-playback');
        window.dispatchEvent(new CustomEvent('reset-search-state'));
      });
    }
  },

  checkAuth: async () => {
    const generation = authGeneration;
    const hadSession = hasSessionTrace();
    const superseded = () => {
      if (generation === authGeneration) return false;
      set({ isInitialized: true });
      return true;
    };
    try {
      const response = await authApi.getCurrentUser();
      if (superseded()) return;
      authRetryAttempt = 0;
      set({
        user: response.user,
        isAuthenticated: true,
        isInitialized: true,
        error: null,
      });
      syncLibrary();
      return;
    } catch (err) {
      if (superseded()) return;
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        removeStoredToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        if (hadSession) clearSignedInLibrary();
        return;
      }
    }

    /* Offline, a 5xx or a cold-starting server says nothing about the session:
       keep the token and the library, and look again shortly. */
    set({ isInitialized: true });
    if (hadSession && !authRetryTimer && authRetryAttempt < AUTH_RETRY_DELAYS_MS.length) {
      authRetryTimer = setTimeout(() => {
        authRetryTimer = null;
        if (!get().isAuthenticated) get().checkAuth();
      }, AUTH_RETRY_DELAYS_MS[authRetryAttempt++]);
    }
  },

  completeOAuth: async () => {
    if (typeof window === 'undefined') return { status: 'none' };
    const params = new URLSearchParams(window.location.search);
    const status = params.get('auth');
    const reason = params.get('reason') || undefined;
    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      window.history.replaceState(null, '', url.toString());
    };

    if (status === 'success') {
      try {
        const response = await authApi.getCurrentUser();
        authGeneration += 1;
        set({
          user: response.user,
          isAuthenticated: true,
          isInitialized: true,
          error: null,
        });
        cleanUrl();
        syncLibrary();
        return { status: 'success' };
      } catch {
        cleanUrl();
        set({ isInitialized: true });
        return { status: 'error', reason: 'failed' };
      }
    }

    if (status === 'error') {
      cleanUrl();
      set({ isInitialized: true });
      return { status: 'error', reason };
    }

    return { status: 'none' };
  },

  clearError: () => set({ error: null, errorCode: null }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-expired', () => {
    const hadSession = useAuthStore.getState().isAuthenticated || getLibraryOwner() !== null;
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    if (hadSession) clearSignedInLibrary();
  });
}
