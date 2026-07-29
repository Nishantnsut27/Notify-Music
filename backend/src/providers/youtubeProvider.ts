/* eslint-disable @typescript-eslint/no-explicit-any */
import { Innertube, UniversalCache } from 'youtubei.js';
import { IMusicProvider } from './musicProvider.interface.js';
import { Song, Album, Artist, Playlist } from '../models/music.model.js';
import { MusicNormalizer } from '../normalizers/musicNormalizer.js';
import { isMusicContent } from '../utils/ytMusicFilter.js';

export class YouTubeProvider implements IMusicProvider {
  readonly name = 'youtube' as const;
  private ytPromise: Promise<Innertube> | null = null;

  private async getInnertube(): Promise<Innertube> {
    if (!this.ytPromise) {
      this.ytPromise = Innertube.create({
        cache: new UniversalCache(false)
      });
    }
    return this.ytPromise;
  }

  async search(query: string, limit = 20): Promise<Song[]> {
    try {
      const yt = await this.getInnertube();
      const searchRes = await yt.music.search(query, { type: 'song' });
      const rawContents = (searchRes as any).contents || (searchRes as any).songs?.contents || [];

      const songs: Song[] = [];
      for (const item of rawContents) {
        const title = typeof item.title === 'string' ? item.title : item.title?.text || item.name || '';
        const artist = Array.isArray(item.artists)
          ? item.artists.map((a: any) => a.name).join(', ')
          : item.author?.name || '';
        const duration = item.duration?.seconds || (typeof item.duration === 'number' ? item.duration : 0);

        if (isMusicContent(title, artist, duration)) {
          const song = MusicNormalizer.normalizeYouTubeSong(item);
          if (song.id && song.name) {
            songs.push(song);
          }
        }
        if (songs.length >= limit) break;
      }

      return songs;
    } catch (error) {
      console.error(`[YouTubeProvider] Search error (${query}):`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  async getSongById(id: string): Promise<Song | null> {
    try {
      const yt = await this.getInnertube();
      const info = await yt.getBasicInfo(id);
      if (!info || !info.basic_info || !info.basic_info.title) return null;

      let audioUrl = `https://www.youtube.com/watch?v=${id}`;
      try {
        const audioFormat = info.chooseFormat({ type: 'audio', quality: 'best' });
        if (audioFormat && audioFormat.url) {
          audioUrl = audioFormat.url;
        } else if (audioFormat && typeof (audioFormat as any).decipher === 'function') {
          const deciphered = (audioFormat as any).decipher(yt.session.player);
          if (typeof deciphered === 'string') {
            audioUrl = deciphered;
          } else if (deciphered && typeof deciphered.then === 'function') {
            audioUrl = await deciphered;
          }
        }
      } catch {
        // Fallback to standard video streaming URL
      }

      const song = MusicNormalizer.normalizeYouTubeSong(
        {
          id,
          title: info.basic_info.title,
          artist_name: info.basic_info.author,
          artist_id: info.basic_info.channel_id,
          duration: info.basic_info.duration,
          thumbnails: info.basic_info.thumbnail
        },
        audioUrl
      );

      return song;
    } catch (error) {
      console.error(`[YouTubeProvider] Get song by ID error (${id}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  async getAlbumById(id: string): Promise<Album | null> {
    try {
      const yt = await this.getInnertube();
      const albumData = await yt.music.getAlbum(id);
      const data = albumData as any;
      if (!data || (!data.title && !data.header) || (Array.isArray(data.contents) && data.contents.length === 0)) {
        return null;
      }
      return MusicNormalizer.normalizeYouTubeAlbum(albumData);
    } catch (error) {
      console.error(`[YouTubeProvider] Get album by ID error (${id}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  async getArtistById(id: string): Promise<Artist | null> {
    try {
      const yt = await this.getInnertube();
      const artistData = await yt.music.getArtist(id);
      const data = artistData as any;
      if (!data || (!data.name && !data.header)) {
        return null;
      }
      return MusicNormalizer.normalizeYouTubeArtist(artistData);
    } catch (error) {
      console.error(`[YouTubeProvider] Get artist by ID error (${id}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  async getPlaylistById(id: string): Promise<Playlist | null> {
    try {
      const yt = await this.getInnertube();
      const playlistData = await yt.music.getPlaylist(id);
      const data = playlistData as any;
      if (!data || (!data.title && !data.header) || (Array.isArray(data.contents) && data.contents.length === 0)) {
        return null;
      }
      return MusicNormalizer.normalizeYouTubePlaylist(playlistData);
    } catch (error) {
      console.error(`[YouTubeProvider] Get playlist by ID error (${id}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  async getSuggestions(id: string, limit = 10): Promise<Song[]> {
    try {
      const song = await this.getSongById(id);
      if (!song) return [];

      const query = song.artist_name ? `${song.name} ${song.artist_name}` : song.name;
      return await this.search(query, limit);
    } catch (error) {
      console.error(`[YouTubeProvider] Get suggestions error (${id}):`, error instanceof Error ? error.message : error);
      return [];
    }
  }
}
