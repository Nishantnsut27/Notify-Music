export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getTrackUrl = (trackId: string): string => {
  return `https://www.jamendo.com/track/${encodeURIComponent(trackId)}`;
};

export const getArtistUrl = (artistId: string): string => {
  return `https://www.jamendo.com/artist/${encodeURIComponent(artistId)}`;
};
