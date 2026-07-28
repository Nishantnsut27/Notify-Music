import { Song, Album, Artist, Playlist, Suggestion } from '../models/music.model.js';
import { extractBestImage, extractBestAudioUrl } from '../utils/mediaHelper.js';

function cleanText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

export class MusicNormalizer {
  static normalizeJioSaavnSong(raw: any): Song {
    const rawArtists = Array.isArray(raw.artists?.primary)
      ? raw.artists.primary.map((a: any) => a.name).join(', ')
      : raw.primaryArtists || raw.singers || 'Unknown Artist';

    const primaryArtistId = Array.isArray(raw.artists?.primary) && raw.artists.primary.length > 0
      ? raw.artists.primary[0].id
      : raw.artistId || '';

    const bestImage = extractBestImage(raw.image || raw.album?.image || raw.images || raw.thumbnail);
    const audioUrl = extractBestAudioUrl(raw.downloadUrl || raw.audio);

    return {
      id: raw.id || '',
      name: cleanText(raw.name || raw.title || 'Untitled Track'),
      duration: typeof raw.duration === 'number' ? raw.duration : parseInt(raw.duration || '0', 10),
      artist_name: cleanText(rawArtists),
      artist_id: primaryArtistId,
      album_name: cleanText(raw.album?.name || (typeof raw.album === 'string' ? raw.album : '')),
      album_id: raw.album?.id || '',
      album_image: bestImage,
      image: bestImage,
      audio: audioUrl,
      audiodownload: audioUrl,
      license_ccurl: '',
      musicinfo: {
        tags: {
          genres: raw.language ? [raw.language] : [],
          instruments: [],
          vartags: []
        }
      },
      provider: 'jiosaavn'
    };
  }

  static normalizeJamendoSong(raw: any): Song {
    const artwork = raw.image || raw.album_image || '/placeholder-album.svg';
    const audioUrl = raw.audio || raw.audiodownload || '';

    return {
      id: raw.id || '',
      name: cleanText(raw.name || 'Untitled Track'),
      duration: typeof raw.duration === 'number' ? raw.duration : parseInt(raw.duration || '0', 10),
      artist_name: cleanText(raw.artist_name || 'Unknown Artist'),
      artist_id: raw.artist_id || '',
      album_name: cleanText(raw.album_name || ''),
      album_id: raw.album_id || '',
      album_image: raw.album_image || artwork,
      image: artwork,
      audio: audioUrl,
      audiodownload: raw.audiodownload || audioUrl,
      license_ccurl: raw.license_ccurl || '',
      musicinfo: {
        tags: {
          genres: raw.musicinfo?.tags?.genres || [],
          instruments: raw.musicinfo?.tags?.instruments || [],
          vartags: raw.musicinfo?.tags?.vartags || []
        }
      },
      provider: 'jamendo'
    };
  }

  static normalizeYouTubeSong(raw: any, audioUrlOverride?: string): Song {
    const title = typeof raw.title === 'string' ? raw.title : raw.title?.text || raw.name || 'Untitled Track';
    const artist = Array.isArray(raw.artists)
      ? raw.artists.map((a: any) => a.name).join(', ')
      : raw.author?.name || raw.artist_name || 'Unknown Artist';
    const artistId = Array.isArray(raw.artists) && raw.artists.length > 0
      ? raw.artists[0].channel_id || raw.artists[0].id || ''
      : raw.author?.channel_id || '';

    const album = raw.album?.name || (typeof raw.album === 'string' ? raw.album : '');
    const albumId = raw.album?.id || '';

    const thumbnails = raw.thumbnails || raw.thumbnail || [];
    const bestThumb = Array.isArray(thumbnails) && thumbnails.length > 0
      ? thumbnails[thumbnails.length - 1].url
      : `/placeholder-album.svg`;

    const duration = typeof raw.duration?.seconds === 'number'
      ? raw.duration.seconds
      : (typeof raw.duration === 'number' ? raw.duration : 0);

    const audioUrl = audioUrlOverride || raw.audio || `https://www.youtube.com/watch?v=${raw.id || raw.video_id || ''}`;

    return {
      id: raw.id || raw.video_id || '',
      name: cleanText(title),
      duration,
      artist_name: cleanText(artist),
      artist_id: artistId,
      album_name: cleanText(album),
      album_id: albumId,
      album_image: bestThumb,
      image: bestThumb,
      audio: audioUrl,
      audiodownload: audioUrl,
      license_ccurl: '',
      musicinfo: {
        tags: {
          genres: ['YouTube Music'],
          instruments: [],
          vartags: []
        }
      },
      provider: 'youtube'
    };
  }

  static normalizeJioSaavnAlbum(raw: any): Album {
    const image = extractBestImage(raw.image);
    const primaryArtist = raw.artists?.primary?.[0]?.name || raw.artist_name || raw.artist || 'Unknown Artist';
    const primaryArtistId = raw.artists?.primary?.[0]?.id || raw.artist_id || '';

    const songs = Array.isArray(raw.songs)
      ? raw.songs.map((song: any) => this.normalizeJioSaavnSong(song))
      : [];

    return {
      id: raw.id || '',
      name: cleanText(raw.name || raw.title || 'Untitled Album'),
      description: cleanText(raw.description || ''),
      year: raw.year || '',
      releasedate: raw.releaseDate || '',
      artist_id: primaryArtistId,
      artist_name: cleanText(primaryArtist),
      image,
      playCount: raw.playCount || 0,
      songCount: raw.songCount || songs.length,
      songs,
      provider: 'jiosaavn'
    };
  }

  static normalizeJamendoAlbum(raw: any): Album {
    const image = raw.image || '/placeholder-album.svg';

    return {
      id: raw.id || '',
      name: cleanText(raw.name || 'Untitled Album'),
      description: '',
      releasedate: raw.releasedate || '',
      artist_id: raw.artist_id || '',
      artist_name: cleanText(raw.artist_name || 'Unknown Artist'),
      image,
      songs: [],
      provider: 'jamendo'
    };
  }

  static normalizeYouTubeAlbum(raw: any): Album {
    const name = typeof raw.title === 'string' ? raw.title : raw.title?.text || raw.name || 'Untitled Album';
    const artist = Array.isArray(raw.artists) ? raw.artists.map((a: any) => a.name).join(', ') : 'Unknown Artist';
    const thumbnails = raw.thumbnails || raw.thumbnail || [];
    const image = Array.isArray(thumbnails) && thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '/placeholder-album.svg';

    const songs = Array.isArray(raw.contents || raw.songs)
      ? (raw.contents || raw.songs).map((s: any) => this.normalizeYouTubeSong(s))
      : [];

    return {
      id: raw.id || raw.album_id || '',
      name: cleanText(name),
      description: cleanText(raw.description || ''),
      year: raw.year || '',
      releasedate: raw.release_date || '',
      artist_id: raw.artists?.[0]?.channel_id || '',
      artist_name: cleanText(artist),
      image,
      songCount: songs.length,
      songs,
      provider: 'youtube'
    };
  }

  static normalizeJioSaavnArtist(raw: any): Artist {
    const image = extractBestImage(raw.image);
    const topSongs = Array.isArray(raw.topSongs)
      ? raw.topSongs.map((song: any) => this.normalizeJioSaavnSong(song))
      : [];
    const topAlbums = Array.isArray(raw.topAlbums)
      ? raw.topAlbums.map((album: any) => this.normalizeJioSaavnAlbum(album))
      : [];

    return {
      id: raw.id || '',
      name: cleanText(raw.name || raw.title || 'Unknown Artist'),
      website: raw.wiki || raw.url || '',
      joindate: raw.dob || '',
      image,
      followerCount: raw.followerCount || 0,
      bio: cleanText(Array.isArray(raw.bio) ? raw.bio.map((b: any) => b.text).join(' ') : (raw.bio || '')),
      topSongs,
      topAlbums,
      provider: 'jiosaavn'
    };
  }

  static normalizeJamendoArtist(raw: any): Artist {
    return {
      id: raw.id || '',
      name: cleanText(raw.name || 'Unknown Artist'),
      website: raw.website || '',
      joindate: raw.joindate || '',
      image: raw.image || '/placeholder-artist.svg',
      provider: 'jamendo'
    };
  }

  static normalizeYouTubeArtist(raw: any): Artist {
    const name = typeof raw.name === 'string' ? raw.name : raw.name?.text || raw.title || 'Unknown Artist';
    const thumbnails = raw.thumbnails || raw.thumbnail || [];
    const image = Array.isArray(thumbnails) && thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '/placeholder-artist.svg';

    const topSongs = Array.isArray(raw.songs?.contents || raw.topSongs)
      ? (raw.songs?.contents || raw.topSongs).map((s: any) => this.normalizeYouTubeSong(s))
      : [];

    return {
      id: raw.id || raw.channel_id || '',
      name: cleanText(name),
      website: '',
      joindate: '',
      image,
      topSongs,
      provider: 'youtube'
    };
  }

  static normalizeJioSaavnPlaylist(raw: any): Playlist {
    const image = extractBestImage(raw.image);
    const tracks = Array.isArray(raw.songs)
      ? raw.songs.map((song: any) => this.normalizeJioSaavnSong(song))
      : [];

    return {
      id: raw.id || '',
      name: cleanText(raw.name || raw.title || 'Untitled Playlist'),
      tracks,
      image,
      description: cleanText(raw.description || ''),
      provider: 'jiosaavn'
    };
  }

  static normalizeYouTubePlaylist(raw: any): Playlist {
    const name = typeof raw.title === 'string' ? raw.title : raw.title?.text || raw.name || 'Untitled Playlist';
    const thumbnails = raw.thumbnails || raw.thumbnail || [];
    const image = Array.isArray(thumbnails) && thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '/placeholder-album.svg';

    const tracks = Array.isArray(raw.contents || raw.tracks)
      ? (raw.contents || raw.tracks).map((t: any) => this.normalizeYouTubeSong(t))
      : [];

    return {
      id: raw.id || raw.playlist_id || '',
      name: cleanText(name),
      tracks,
      image,
      description: cleanText(raw.description || ''),
      provider: 'youtube'
    };
  }

  static normalizeSuggestion(song: Song): Suggestion {
    return {
      id: song.id,
      name: cleanText(song.name),
      artist_name: cleanText(song.artist_name),
      image: song.image,
      audio: song.audio,
      duration: song.duration,
      provider: song.provider
    };
  }
}
