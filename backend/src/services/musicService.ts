import { IMusicProvider } from '../providers/musicProvider.interface.js';
import { JioSaavnProvider } from '../providers/jiosaavnProvider.js';
import { YouTubeProvider } from '../providers/youtubeProvider.js';
import { JamendoProvider } from '../providers/jamendoProvider.js';
import { Song, Album, Artist, Playlist, Suggestion } from '../models/music.model.js';
import { MusicNormalizer } from '../normalizers/musicNormalizer.js';
import { deduplicateSongs, rankSongs } from '../utils/deduplication.js';
import { discoveryService } from './discoveryService.js';
import { globalCacheService } from './cacheService.js';

export class MusicService {
  private jiosaavnProvider: IMusicProvider;
  private youtubeProvider: IMusicProvider;
  private jamendoProvider: IMusicProvider;

  constructor() {
    this.jiosaavnProvider = new JioSaavnProvider();
    this.youtubeProvider = new YouTubeProvider();
    this.jamendoProvider = new JamendoProvider();
  }

  async search(query: string, limit = 20): Promise<{ songs: Song[]; provider: string }> {
    if (!query || !query.trim()) {
      return { songs: [], provider: 'jiosaavn,youtube' };
    }

    const trimmedQuery = query.trim().toLowerCase();
    const cacheKey = `search:${trimmedQuery}:${limit}`;

    return globalCacheService.getOrFetch(cacheKey, async () => {
      try {
        const [jioResult, ytResult] = await Promise.allSettled([
          this.jiosaavnProvider.search(trimmedQuery, limit),
          this.youtubeProvider.search(trimmedQuery, limit)
        ]);

        const jioSongs: Song[] = jioResult.status === 'fulfilled' ? jioResult.value : [];
        const ytSongs: Song[] = ytResult.status === 'fulfilled' ? ytResult.value : [];

        const merged = [...jioSongs, ...ytSongs];
        
        const avoidWords = ['mashup', 'mix', 'remix', 'lofi', 'slowed', 'reverb'];
        let filtered = merged;
        
        // If the query doesn't explicitly contain these terms, try to filter them out
        const isRequestingMix = avoidWords.some(w => trimmedQuery.includes(w));
        if (!isRequestingMix) {
          filtered = merged.filter(song => {
            const lowerName = song.name.toLowerCase();
            return !avoidWords.some(w => lowerName.includes(w));
          });
          // Fallback if filtering removes everything
          if (filtered.length === 0 && merged.length > 0) {
            filtered = merged;
          }
        }

        const deduped = deduplicateSongs(filtered);
        const ranked = rankSongs(deduped, trimmedQuery);

        if (ranked.length > 0) {
          return { songs: ranked.slice(0, limit), provider: 'jiosaavn,youtube' };
        }

        const jamendoSongs = await this.jamendoProvider.search(trimmedQuery, limit);
        return { songs: jamendoSongs, provider: 'jamendo' };
      } catch {
        const jamendoSongs = await this.jamendoProvider.search(trimmedQuery, limit);
        return { songs: jamendoSongs, provider: 'jamendo' };
      }
    });
  }

  async getSongById(id: string): Promise<Song | null> {
    if (!id) return null;
    const cacheKey = `song:${id}`;

    return globalCacheService.getOrFetch(cacheKey, async () => {
      let song = await this.jiosaavnProvider.getSongById(id);
      if (song) return song;

      song = await this.youtubeProvider.getSongById(id);
      if (song) return song;

      song = await this.jamendoProvider.getSongById(id);
      return song;
    });
  }

  async getAlbumById(id: string): Promise<Album | null> {
    if (!id) return null;
    const cacheKey = `album:${id}`;

    return globalCacheService.getOrFetch(cacheKey, async () => {
      let album = await this.jiosaavnProvider.getAlbumById(id);
      if (album) return album;

      album = await this.youtubeProvider.getAlbumById(id);
      if (album) return album;

      album = await this.jamendoProvider.getAlbumById(id);
      return album;
    });
  }

  async getArtistById(id: string): Promise<Artist | null> {
    if (!id) return null;
    const cacheKey = `artist:${id}`;

    return globalCacheService.getOrFetch(cacheKey, async () => {
      let artist = await this.jiosaavnProvider.getArtistById(id);
      if (artist) return artist;

      artist = await this.youtubeProvider.getArtistById(id);
      if (artist) return artist;

      artist = await this.jamendoProvider.getArtistById(id);
      return artist;
    });
  }

  async getPlaylistById(id: string): Promise<Playlist | null> {
    if (!id) return null;
    const cacheKey = `playlist:${id}`;

    return globalCacheService.getOrFetch(cacheKey, async () => {
      let playlist = await this.jiosaavnProvider.getPlaylistById(id);
      if (playlist) return playlist;

      playlist = await this.youtubeProvider.getPlaylistById(id);
      if (playlist) return playlist;

      playlist = await this.jamendoProvider.getPlaylistById(id);
      return playlist;
    });
  }

  async getSuggestions(id: string, limit = 10): Promise<Suggestion[]> {
    if (!id) return [];
    const cacheKey = `suggestions:${id}:${limit}`;

    return globalCacheService.getOrFetch(cacheKey, async () => {
      let songs = await this.jiosaavnProvider.getSuggestions(id, limit);
      if (songs.length === 0) {
        songs = await this.youtubeProvider.getSuggestions(id, limit);
      }
      if (songs.length === 0) {
        songs = await this.jamendoProvider.getSuggestions(id, limit);
      }

      return songs.map(song => MusicNormalizer.normalizeSuggestion(song));
    });
  }

  async getTrending(limit = 20): Promise<{ songs: Song[]; provider: string }> {
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyword = discoveryService.getNextKeyword();
      const result = await this.search(keyword, limit);

      if (result.songs.length > 0) {
        return result;
      }
    }

    return { songs: [], provider: 'jiosaavn,youtube' };
  }
}
