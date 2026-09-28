import type { SyntheticEvent } from 'react';

export const FALLBACK_ART = '/Favicon.png';

/** Swaps a broken cover for the fallback, once, so a missing fallback cannot loop. */
export const showFallbackArt = (event: SyntheticEvent<HTMLImageElement>): void => {
  const img = event.currentTarget;
  if (img.src.endsWith(FALLBACK_ART)) return;
  img.src = FALLBACK_ART;
};
