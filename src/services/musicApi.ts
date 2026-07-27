import type { Track } from '../types/types';
import { API_ENDPOINTS, PLAYER_DEFAULTS } from '../config/constants';
import { fetchJson, type ApiResponse } from './apiClient';
import { formatDuration, getTrackUrl, getArtistUrl } from '../utils/formatters';

const searchCache = new Map<string, { timestamp: number; tracks: Track[] }>();
const CACHE_TTL_MS = 300000;

export class MusicAPI {
  static async searchTracks(query: string, limit = PLAYER_DEFAULTS.DEFAULT_SEARCH_LIMIT): Promise<Track[]> {
    if (!query || !query.trim()) return [];

    const cacheKey = `${query.trim().toLowerCase()}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.tracks;
    }

    try {
      const url = `${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query.trim())}&limit=${limit}`;
      const body = await fetchJson<ApiResponse<Track[]>>(url);

      if (!body.success || !Array.isArray(body.data)) {
        throw new Error('Invalid response payload format from music backend.');
      }

      if (body.data.length === 0) {
        throw new Error(`No music found for "${query}". Try searching for genres like rap, pop, electronic, or jazz.`);
      }

      searchCache.set(cacheKey, { timestamp: Date.now(), tracks: body.data });
      return body.data;
    } catch (error) {
      console.error('[MusicAPI] Search error:', error);
      throw error;
    }
  }

  static async getTrendingTracks(limit = PLAYER_DEFAULTS.DEFAULT_TRENDING_LIMIT): Promise<Track[]> {
    try {
      const url = `${API_ENDPOINTS.TRENDING}?limit=${limit}`;
      const body = await fetchJson<ApiResponse<Track[]>>(url);

      if (!body.success || !Array.isArray(body.data)) {
        throw new Error('Invalid response payload format from music backend.');
      }

      return body.data;
    } catch (error) {
      console.error('[MusicAPI] Get trending tracks error:', error);
      throw new Error('🎵 Trending music is temporarily unavailable. Please try searching for your favorite tracks instead.');
    }
  }

  static async getTrackById(id: string): Promise<Track | null> {
    try {
      const url = API_ENDPOINTS.SONG(id);
      const body = await fetchJson<ApiResponse<Track>>(url);
      return body.success ? body.data : null;
    } catch (error) {
      console.error('[MusicAPI] Get track by ID error:', error);
      return null;
    }
  }

  static async getTracksByGenre(genre: string, limit = PLAYER_DEFAULTS.DEFAULT_SEARCH_LIMIT): Promise<Track[]> {
    return this.searchTracks(genre, limit);
  }
}

// Backward compatibility exports
export const JamendoAPI = MusicAPI;
export { formatDuration, getTrackUrl, getArtistUrl };
export const getJamendoTrackUrl = getTrackUrl;
export const getJamendoArtistUrl = getArtistUrl;
