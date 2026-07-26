import { fetchJson, API_BASE_URL } from './apiClient';

const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  accountStatus: 'active' | 'suspended' | 'pending';
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: UserProfile;
  token?: string;
  error?: string;
}

export const authApi = {
  /**
   * Register a new user account
   */
  async register(data: { fullName: string; email: string; password: string }): Promise<AuthResponse> {
    return fetchJson<AuthResponse>(`${AUTH_BASE_URL}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Log in user
   */
  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return fetchJson<AuthResponse>(`${AUTH_BASE_URL}/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Log out user
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    return fetchJson<{ success: boolean; message: string }>(`${AUTH_BASE_URL}/logout`, {
      method: 'POST',
    });
  },

  /**
   * Fetch current authenticated user session
   */
  async getCurrentUser(): Promise<AuthResponse> {
    return fetchJson<AuthResponse>(`${AUTH_BASE_URL}/me`, {
      method: 'GET',
    });
  },
};
