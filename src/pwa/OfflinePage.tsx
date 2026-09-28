import { WifiOff, RotateCcw } from 'lucide-react';

/** Shown in the content area while offline; the app shell and player stay usable around it. */
export function OfflinePage({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="offline-page" role="status">
      <div className="offline-page-content">
        <div className="offline-icon-wrapper">
          <WifiOff size={64} strokeWidth={1.5} />
        </div>
        <h1 className="offline-title">No Internet Connection</h1>
        <p className="offline-message">
          You need an internet connection to stream music, browse your library, and search for tracks.
        </p>
        <div className="offline-actions">
          <button className="offline-btn offline-btn-primary" onClick={onRetry}>
            <RotateCcw size={16} />
            Retry
          </button>
        </div>
      </div>
      <p className="offline-brand">Soundrift &mdash; Drift Into Your Next Favorite.</p>
    </div>
  );
}
