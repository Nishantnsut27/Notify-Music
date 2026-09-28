import { STORAGE_KEYS } from '../config/constants';

const TOKEN_KEY = 'notify_auth_token';
const REMEMBER_KEY = 'notify_remember_me';

export function getStoredToken(): string | null {
  const remember = localStorage.getItem(REMEMBER_KEY) === 'true';
  if (remember) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, rememberMe: boolean): void {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REMEMBER_KEY, 'true');
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(REMEMBER_KEY);
  }
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}

export function getLibraryOwner(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LIBRARY_OWNER);
  } catch {
    return null;
  }
}

export function setLibraryOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(STORAGE_KEYS.LIBRARY_OWNER, userId);
    else localStorage.removeItem(STORAGE_KEYS.LIBRARY_OWNER);
  } catch {
    /* Without storage nothing was persisted for anyone, so there is nothing to attribute. */
  }
}
