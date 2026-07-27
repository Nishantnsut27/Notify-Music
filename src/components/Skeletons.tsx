import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonTrackRow() {
  return (
    <div className="skeleton-track-row">
      <Skeleton width="40px" height="40px" borderRadius="6px" className="skeleton-artwork" />
      <div className="skeleton-track-info">
        <Skeleton width="45%" height="0.85rem" style={{ marginBottom: '0.35rem' }} />
        <Skeleton width="30%" height="0.7rem" />
      </div>
      <div className="skeleton-track-meta">
        <Skeleton width="45px" height="0.75rem" />
        <Skeleton width="60px" height="1.2rem" borderRadius="12px" />
      </div>
    </div>
  );
}

export function SkeletonTrackList({ count = 8 }: { count?: number }) {
  return (
    <div className="skeleton-track-list">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonTrackRow key={index} />
      ))}
    </div>
  );
}

export function SkeletonPlaylistCard() {
  return (
    <div className="skeleton-playlist-card">
      <div className="skeleton-playlist-header">
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height="1.25rem" style={{ marginBottom: '0.4rem' }} />
          <Skeleton width="35%" height="0.85rem" />
        </div>
        <Skeleton width="32px" height="32px" borderRadius="50%" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
        <SkeletonTrackRow />
        <SkeletonTrackRow />
        <SkeletonTrackRow />
      </div>
    </div>
  );
}

export function SkeletonPlaylistsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="playlists-grid">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonPlaylistCard key={index} />
      ))}
    </div>
  );
}
export function SkeletonGuestCard() {
  return (
    <div className="guest-music-card" style={{ cursor: 'default' }}>
      <Skeleton width="100%" height="auto" style={{ aspectRatio: '1 / 1', marginBottom: '0.75rem' }} borderRadius="8px" />
      <Skeleton width="80%" height="1rem" style={{ marginBottom: '0.4rem' }} />
      <Skeleton width="60%" height="0.85rem" />
    </div>
  );
}

export function SkeletonGuestCardsGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="guest-cards-grid">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonGuestCard key={index} />
      ))}
    </div>
  );
}
