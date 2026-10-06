import { WifiOff, RotateCcw, Download } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

/** Shown in the content area while offline; the app shell and player stay usable around it. */
export function OfflinePage({ onRetry }: { onRetry: () => void }) {
  const setCurrentView = usePlayerStore((state) => state.setCurrentView);

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
          <button className="offline-btn offline-btn-primary" onClick={() => setCurrentView('offline')}>
            <Download size={16} />
            Open Offline Music
          </button>
          <button className="offline-btn" onClick={onRetry}>
            <RotateCcw size={16} />
            Retry connection
          </button>
        </div>
      </div>
      <p className="offline-brand">Soundrift &mdash; Drift Into Your Next Favorite.</p>
    </div>
  );
}