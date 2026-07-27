import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`empty-state-modern ${className}`}>
      {icon && <div className="empty-state-icon-wrapper">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>

      {(actionText || secondaryActionText) && (
        <div className="empty-state-actions">
          {actionText && onAction && (
            <button onClick={onAction} className="btn btn-primary">
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button onClick={onSecondaryAction} className="btn btn-ghost">
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptySearchResults({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      }
      title="This song is not available"
      description="Try searching for another song, popular artists, or titles."
      actionText={onClear ? 'Clear Search' : undefined}
      onAction={onClear}
    />
  );
}

export function EmptyFavorites({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      }
      title="Your favorites list is empty"
      description="Tap the heart icon on any track to save your favorite songs here for easy access."
      actionText={onBrowse ? 'Explore Music' : undefined}
      onAction={onBrowse}
    />
  );
}

export function EmptyPlaylists({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      }
      title="No playlists created yet"
      description="Create playlists to organize your favorite tracks and build custom mixes."
      actionText={onCreate ? 'Create First Playlist' : undefined}
      onAction={onCreate}
    />
  );
}

export function EmptyRecentlyPlayed({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      }
      title="No recently played tracks"
      description="Start playing music to build your queue and return to your recent tracks anytime."
      actionText={onBrowse ? 'Start Listening' : undefined}
      onAction={onBrowse}
    />
  );
}

export function EmptyHistory({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      icon={
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      }
      title="Listening history is empty"
      description="Your listening stats will appear here as you play songs."
      actionText={onBrowse ? 'Explore Music' : undefined}
      onAction={onBrowse}
    />
  );
}
