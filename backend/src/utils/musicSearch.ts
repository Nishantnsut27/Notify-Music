import { Song } from '../models/music.model.js';

const REMIX_TERMS = ['mashup', 'mix', 'remix', 'slowed', 'reverb', 'lofi', 'live', 'cover', 'karaoke', 'instrumental', 'nightcore'];
const OFFICIAL_TERMS = ['official audio', 'official video', 'official lyric video', 'official'];
const LOW_QUALITY_IMAGE_MARKERS = ['/50x50/', '/90x90/', '/150x150/', '_50x50', '_90x90', '_150x150'];

function normalizeString(value: string): string {
  if (!value) return '';

  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/official audio|official video|official lyric video|official|lyric video|remastered|version|from ".*?"/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

function containsAny(text: string, values: readonly string[]): boolean {
  return values.some(value => text.includes(value));
}

function hasLowQualityArtwork(song: Song): boolean {
  const image = song.image || song.album_image || '';
  if (!image) return true;
  return LOW_QUALITY_IMAGE_MARKERS.some(marker => image.includes(marker));
}

export function isLikelyOfficialSong(song: Song): boolean {
  const title = `${song.name} ${song.artist_name}`.toLowerCase();
  return containsAny(title, OFFICIAL_TERMS) && !containsAny(title, REMIX_TERMS);
}

export function isSearchNoise(song: Song, query: string): boolean {
  const lowerQuery = normalizeString(query);
  if (!lowerQuery) return false;

  const title = normalizeString(song.name);
  if (containsAny(lowerQuery, REMIX_TERMS)) {
    return false;
  }

  return containsAny(title, REMIX_TERMS);
}

export function scoreSongForQuality(song: Song): number {
  let score = 0;
  const title = `${song.name} ${song.artist_name}`.toLowerCase();

  if (isLikelyOfficialSong(song)) {
    score += 20;
  }

  if (containsAny(title, REMIX_TERMS)) {
    score -= 18;
  }

  if (!hasLowQualityArtwork(song)) {
    score += 10;
  }

  if (song.audio) {
    score += 8;
  }

  if (song.album_image && song.album_image !== '/placeholder-album.svg') {
    score += 4;
  }

  if (song.artist_name && song.artist_name !== 'Unknown Artist') {
    score += 4;
  }

  if (song.duration > 0) {
    score += 2;
  }

  if (song.provider === 'jiosaavn') {
    score += 8;
  }

  return score;
}

export function normalizeStringForSearch(value: string): string {
  return normalizeString(value);
}