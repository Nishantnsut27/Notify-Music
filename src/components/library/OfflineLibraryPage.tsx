import { useEffect, useState } from 'react';
import { Download, HardDrive, Play, Trash2 } from 'lucide-react';
import { TrackListModern } from '../TrackListModern';
import { ConfirmModal } from '../ConfirmModal';
import { EmptyState } from '../EmptyState';
import { usePlayerStore } from '../../store/playerStore';
import { clearOfflineTracks, getOfflineStorageStats, getOfflineTracks } from '../../services/offlineLibrary';
import type { QueueContext, Track } from '../../types/types';

const OFFLINE_CONTEXT: QueueContext = { kind: 'playlist', id: 'offline', name: 'Offline Music' };

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function OfflineLibraryPage() {
  const setCurrentView = usePlayerStore((state) => state.setCurrentView);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState({ count: 0, bytes: 0, maxBytes: 480 * 1024 * 1024 });
  const [loading, setLoading] = useState(true);
  const [clearOpen, setClearOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [nextTracks, nextStats] = await Promise.all([getOfflineTracks(), getOfflineStorageStats()]);
      setTracks(nextTracks);
      setStats(nextStats);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('soundrift-offline-library-changed', refresh);
    return () => window.removeEventListener('soundrift-offline-library-changed', refresh);
  }, []);

  const playAll = () => {
    if (tracks.length) usePlayerStore.getState().playTrack(tracks[0], tracks, 0, OFFLINE_CONTEXT);
  };

  return (
    <div className="library-page offline-library-page">
      <header className="browse-head">
        <p className="t-eyebrow">My Library</p>
        <h1 className="t-h1">Offline Music</h1>
        <p className="t-body browse-head-promise">
          {loading ? 'Checking saved music…' : tracks.length
            ? `${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'} saved on this device.`
            : 'Save songs from a track menu to play them without an internet connection.'}
        </p>
        {tracks.length > 0 && (
          <div className="library-head-actions">
            <button type="button" className="sr-btn sr-btn-primary" onClick={playAll}>
              <Play size={15} fill="currentColor" /> Play all
            </button>
            <button type="button" className="sr-btn sr-btn-quiet" onClick={() => setClearOpen(true)}>
              <Trash2 size={15} /> Clear all
            </button>
          </div>
        )}
      </header>
      <div className="offline-storage-card">
        <div className="offline-storage-icon"><HardDrive size={20} /></div>
        <div className="offline-storage-copy">
          <strong><Download size={15} /> {stats.count} offline {stats.count === 1 ? 'track' : 'tracks'}</strong>
          <span>{formatBytes(stats.bytes)} stored in Soundrift's private browser storage</span>
        </div>
        <div className="offline-storage-meter">
          <span style={{ width: `${Math.min(100, (stats.bytes / Math.max(stats.maxBytes, 1)) * 100)}%` }} />
        </div>
      </div>
      {!loading && tracks.length === 0 ? (
        <EmptyState
          title="No offline music yet"
          description="Open a song's three-dot menu and choose “Make available offline”."
          actionText="Browse Music"
          onAction={() => setCurrentView('home')}
        />
      ) : tracks.length > 0 ? (
        <TrackListModern tracks={tracks} variant="list" showAddToPlaylist queueContext={OFFLINE_CONTEXT} />
      ) : null}
      {clearOpen && (
        <ConfirmModal
          isOpen={clearOpen}
          title="Clear Offline Music"
          message="Remove all saved offline audio from this device?"
          confirmText="Clear All"
          cancelText="Cancel"
          variant="danger"
          onConfirm={async () => { await clearOfflineTracks(); setClearOpen(false); }}
          onCancel={() => setClearOpen(false)}
        />
      )}
    </div>
  );
}
