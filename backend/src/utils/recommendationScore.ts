import { Song } from '../models/music.model.js';
import { normalizeStringForSearch } from './musicSearch.js';

export interface ScoredCandidate {
  song: Song;
  score: number;
  reason: string;
}

const WEIGHTS = {
  sameAlbum: 100,
  sameArtist: 90,
  relatedArtist: 70,
  sameGenre: 50,
  matchingTags: 40,
  sameLanguage: 10,
  curated: 20,
  trending: 5,
} as const;

// Split before normalizing: normalization strips the commas that separate artists.
const splitArtists = (value: string): string[] =>
  value.split(',').map((name) => normalizeStringForSearch(name)).filter(Boolean);

function containsArtist(base: string, other: string): boolean {
  const baseArtists = splitArtists(base);
  const otherArtists = splitArtists(other);
  return baseArtists.some((name) => otherArtists.includes(name));
}

function sameAlbum(a: Song, b: Song): boolean {
  if (a.album_id && b.album_id) return String(a.album_id) === String(b.album_id);
  if (a.album_name && b.album_name) {
    const left = normalizeStringForSearch(a.album_name);
    return Boolean(left) && left === normalizeStringForSearch(b.album_name);
  }
  return false;
}

function sameArtist(a: Song, b: Song): boolean {
  if (a.artist_id && b.artist_id && String(a.artist_id) === String(b.artist_id)) return true;
  if (a.artist_name && b.artist_name) return containsArtist(a.artist_name, b.artist_name);
  return false;
}

function sharedGenres(a: Song, b: Song): string[] {
  const aGenres = a.musicinfo?.tags?.genres || [];
  const bGenres = b.musicinfo?.tags?.genres || [];
  return aGenres.filter((g: string) => bGenres.includes(g));
}

function sharedVartags(a: Song, b: Song): string[] {
  const aTags = a.musicinfo?.tags?.vartags || [];
  const bTags = b.musicinfo?.tags?.vartags || [];
  return aTags.filter((t: string) => bTags.includes(t));
}

export function scoreCandidate(source: Song, candidate: Song, sourceProviderNative = false): ScoredCandidate {
  if (!source || !candidate) {
    return { song: candidate, score: 0, reason: 'invalid' };
  }

  if (sameAlbum(source, candidate)) {
    return { song: candidate, score: WEIGHTS.sameAlbum, reason: 'same album' };
  }

  if (sameArtist(source, candidate)) {
    return { song: candidate, score: WEIGHTS.sameArtist, reason: 'same artist' };
  }

  let score = 0;
  let reason = '';

  const genres = sharedGenres(source, candidate);
  if (genres.length > 0) {
    score += WEIGHTS.sameGenre;
    reason = `shared genre: ${genres[0]}`;
  }

  const tags = sharedVartags(source, candidate);
  if (tags.length > 0) {
    score += WEIGHTS.matchingTags;
    reason = reason ? `${reason}; shared tag: ${tags[0]}` : `shared tag: ${tags[0]}`;
  }

  if (source.language && candidate.language && source.language === candidate.language) {
    score += WEIGHTS.sameLanguage;
    reason = reason ? `${reason}; same language` : 'same language';
  }

  if (sourceProviderNative) {
    score += 8;
    reason = reason ? `${reason}; provider native` : 'provider native';
  }

  if (score <= 0) {
    reason = 'weak similarity';
  }

  return { song: candidate, score, reason };
}
