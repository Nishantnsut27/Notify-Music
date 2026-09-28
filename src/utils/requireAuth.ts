import { useAuthStore } from '../store/authStore';
import type { AuthMode } from '../components/auth/AuthModal';

export type AuthGateMode = Extract<AuthMode, 'login' | 'signup'>;

/**
 * Gate for actions that only exist for signed-in users (favorites, playlists,
 * library sync). Returns true when the action may proceed; otherwise opens the
 * existing auth modal and returns false.
 *
 * Guests deliberately have no local fallback here: nothing is persisted for
 * them, so the action converts instead of silently half-working.
 */
export function requireAuth(mode: AuthGateMode = 'login'): boolean {
  if (useAuthStore.getState().isAuthenticated) return true;
  window.dispatchEvent(new CustomEvent<AuthMode>('open-auth-modal', { detail: mode }));
  return false;
}
