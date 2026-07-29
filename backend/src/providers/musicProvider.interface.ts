import { Song, Album, Artist, Playlist } from '../models/music.model.js';

export interface IMusicProvider {
  readonly name: 'jiosaavn' | 'jamendo';
  search(query: string, limit?: number): Promise<Song[]>;
  getSongById(id: string): Promise<Song | null>;
  getAlbumById(id: string): Promise<Album | null>;
  getArtistById(id: string): Promise<Artist | null>;
  getPlaylistById(id: string): Promise<Playlist | null>;
  getSuggestions(id: string, limit?: number): Promise<Song[]>;
}
