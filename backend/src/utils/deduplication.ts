import { Song } from '../models/music.model.js';
import { normalizeStringForSearch, scoreSongForQuality, isLikelyOfficialSong } from './musicSearch.js';

const PROVIDER_PRIORITY: Record<string, number> = {
  jiosaavn: 1,
  jamendo: 3
};

export function areSongsDuplicate(s1: Song, s2: Song): boolean {
  const normTitle1 = normalizeStringForSearch(s1.name);
  const normTitle2 = normalizeStringForSearch(s2.name);

  if (!normTitle1 || !normTitle2) return false;
  if (normTitle1 !== normTitle2) return false;

  const normArtist1 = normalizeStringForSearch(s1.artist_name);
  const normArtist2 = normalizeStringForSearch(s2.artist_name);

  const artistMatches =
    !normArtist1 ||
    !normArtist2 ||
    normArtist1.includes(normArtist2) ||
    normArtist2.includes(normArtist1);

  if (!artistMatches) return false;

  if (s1.duration > 0 && s2.duration > 0) {
    const durationDiff = Math.abs(s1.duration - s2.duration);
    if (durationDiff > 6) return false;
  }

  return true;
}

export function deduplicateSongs(songs: Song[]): Song[] {
  const result: Song[] = [];

  for (const song of songs) {
    const existingIndex = result.findIndex(item => areSongsDuplicate(item, song));
    if (existingIndex === -1) {
      result.push(song);
    } else {
      const existing = result[existingIndex];
      const existingPriority = PROVIDER_PRIORITY[existing.provider || ''] || 99;
      const currentPriority = PROVIDER_PRIORITY[song.provider || ''] || 99;
      const existingQuality = scoreSongForQuality(existing);
      const currentQuality = scoreSongForQuality(song);

      if (currentQuality > existingQuality || (currentQuality === existingQuality && currentPriority < existingPriority) || (currentQuality === existingQuality && currentPriority === existingPriority && isLikelyOfficialSong(song) && !isLikelyOfficialSong(existing))) {
        result[existingIndex] = song;
      }
    }
  }

  return result;
}

const DERIVATIVE_TITLE_PATTERN = /\b(?:remix|mashup|slowed|reverb|cover)\b/;
const DERIVATIVE_QUERY_PATTERN = /\b(?:remix|mashup|slowed)\b/;

export function rankSongs(songs: Song[], query: string): Song[] {
  if (!query || !query.trim()) return songs;
  const normQuery = normalizeStringForSearch(query);
  const queryTerms = query.toLowerCase();

  const scored = songs.map(song => {
    let score = 0;
    const normTitle = normalizeStringForSearch(song.name);
    const normArtist = normalizeStringForSearch(song.artist_name);
    const rawTitle = `${song.name} ${song.artist_name}`.toLowerCase();

    if (normTitle === normQuery) {
      score += 100;
    } else if (normTitle.startsWith(normQuery)) {
      score += 60;
    } else if (normTitle.includes(normQuery)) {
      score += 30;
    }

    if (normArtist === normQuery) {
      score += 50;
    } else if (normArtist.includes(normQuery)) {
      score += 25;
    }

    if (isLikelyOfficialSong(song)) {
      score += 15;
    }

    // Prefer complete metadata and normal-length releases when results otherwise tie.
    if (song.artist_id) score += 4;
    if (song.album_id) score += 3;
    if (song.duration >= 90 && song.duration <= 900) score += 2;

    if (DERIVATIVE_TITLE_PATTERN.test(rawTitle)) {
      score -= DERIVATIVE_QUERY_PATTERN.test(queryTerms) ? 0 : 20;
    }

    if (song.album_image && song.album_image !== '/placeholder-album.svg') {
      score += 5;
    }

    const providerPriority = PROVIDER_PRIORITY[song.provider || ''] || 99;
    score += (10 - providerPriority);

    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(item => item.song);
}
