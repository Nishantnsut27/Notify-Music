import { useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { TrackListModern } from './components/TrackListModern';
import { PlayerControls } from './components/PlayerControls';
import { Sidebar } from './components/Sidebar';
import { ConfirmModal } from './components/ConfirmModal';
import { PlaylistMenu } from './components/PlaylistMenu';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EmptyFavorites, EmptyPlaylists } from './components/EmptyState';
import { usePlayerStore } from './store/playerStore';
import { useToastStore } from './store/toastStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { MusicAPI } from './services/musicApi';
import type { Playlist } from './types/types';

import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/player.css';
import './styles/animations.css';

function App() {
  const [showPlaylistActions, setShowPlaylistActions] = useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [playlistToRename, setPlaylistToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showClearFavoritesModal, setShowClearFavoritesModal] = useState(false);

  const {
    currentView,
    isSidebarOpen,
    results,
    isLoading,
    error,
    trending,
    playlists,
    favorites,
    clearFavorites,
    setTrending,
    setLoading,
    setError,
    toggleSidebar,
    deletePlaylist,
    renamePlaylist
  } = usePlayerStore();

  useKeyboardShortcuts();

  const handleEditPlaylist = (playlistId: string, currentName: string) => {
    setPlaylistToRename({ id: playlistId, name: currentName });
    setRenameInput(currentName);
    setShowPlaylistActions(null);
  };

  const confirmRenamePlaylist = () => {
    if (playlistToRename && renameInput.trim()) {
      renamePlaylist(playlistToRename.id, renameInput.trim());
      useToastStore.getState().addToast({
        type: 'success',
        title: 'Playlist Renamed',
        message: `Renamed to "${renameInput.trim()}"`,
      });
      setPlaylistToRename(null);
      setRenameInput('');
    }
  };

  const handleSavePlaylistName = () => {
    if (editingPlaylist && editPlaylistName.trim()) {
      renamePlaylist(editingPlaylist, editPlaylistName.trim());
      setEditingPlaylist(null);
      setEditPlaylistName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingPlaylist(null);
    setEditPlaylistName('');
  };

  const handleDeletePlaylist = (playlistId: string, playlistName: string) => {
    setPlaylistToDelete({ id: playlistId, name: playlistName });
    setShowPlaylistActions(null);
  };

  const confirmDeletePlaylist = () => {
    if (playlistToDelete) {
      const deletedName = playlistToDelete.name;
      deletePlaylist(playlistToDelete.id);
      useToastStore.getState().addToast({
        type: 'info',
        title: 'Playlist Deleted',
        message: `Deleted "${deletedName}"`,
      });
      setPlaylistToDelete(null);
    }
  };

  const confirmClearFavorites = () => {
    clearFavorites();
    useToastStore.getState().addToast({
      type: 'info',
      title: 'Favorites Cleared',
      message: 'Removed all tracks from your favorites.',
    });
    setShowClearFavoritesModal(false);
  };

  const handleExportPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const dataStr = JSON.stringify(playlist, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playlist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_playlist.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    useToastStore.getState().addToast({
      type: 'info',
      title: 'Playlist Exported',
      message: `Exported "${playlist.name}" JSON file`,
    });

    setShowPlaylistActions(null);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlaylistActions && !(event.target as Element).closest('.playlist-card-actions')) {
        setShowPlaylistActions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlaylistActions]);

  useEffect(() => {
    const loadTrending = async () => {
      if (trending.length === 0) {
        setLoading(true);
        setError(null);
        try {
          console.log('🎵 Loading trending rap tracks...');
          const tracks = await MusicAPI.getTrendingTracks(25);
          setTrending(tracks);
          console.log('✅ Loaded trending tracks:', tracks.length);
        } catch (error) {
          console.error('❌ Failed to load trending tracks:', error);
          const errorMsg = error instanceof Error ? error.message :
            '🎪 Trending tracks are temporarily unavailable. Try searching for specific genres like rap, electronic, or jazz.';
          setError(errorMsg);
        } finally {
          setLoading(false);
        }
      }
    };

    loadTrending();
  }, [trending.length, setTrending, setLoading, setError]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.setProperty('--bg', '#000000', 'important');
    document.documentElement.style.setProperty('--text', '#ffffff', 'important');
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#ffffff';
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      usePlayerStore.getState().closeSidebar();
    }
  }, [currentView]);

  const renderMainContent = () => {
    switch (currentView) {
      case 'search':
        return (
          <div className="view-container">
            <div className="content-search-container">
              <SearchBar />
            </div>
            {results.length > 0 ? (
              <div>
                <TrackListModern
                  tracks={results}
                  title="Search Results"
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            ) : (
              <div>
                <TrackListModern
                  tracks={trending}
                  title="Trending Songs"
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            )}
          </div>
        );

      case 'favorites':
        return (
          <div className="view-container">
            <div className="page-header">
              <div className="page-header-content">
                <div>
                  <h1 className="page-title">Your Favorites</h1>
                  <p className="page-subtitle">
                    {favorites.length} {favorites.length === 1 ? 'track' : 'tracks'}
                  </p>
                </div>
                {favorites.length > 0 && (
                  <button
                    className="clear-favorites-btn"
                    onClick={() => setShowClearFavoritesModal(true)}
                    title="Clear all favorites"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {favorites.length === 0 ? (
              <EmptyFavorites
                onBrowse={() => {
                  usePlayerStore.getState().setCurrentView('search');
                }}
              />
            ) : (
              <TrackListModern
                tracks={favorites}
                showAddToPlaylist={true}
              />
            )}
          </div>
        );

      case 'playlists':
        return (
          <div className="view-container">
            <div className="page-header">
              <h1 className="page-title">Your Playlists</h1>
              <p className="page-subtitle">
                {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
              </p>
            </div>

            {playlists.length === 0 ? (
              <EmptyPlaylists />
            ) : (
              <div className="playlists-grid">
                {playlists.map((playlist) => (
                  <div key={playlist.id} className={`playlist-card ${showPlaylistActions === playlist.id ? 'menu-open' : ''}`}>
                    <div className="playlist-card-header">
                      <div className="playlist-card-info">
                        {editingPlaylist === playlist.id ? (
                          <div className="playlist-edit-form">
                            <input
                              type="text"
                              value={editPlaylistName}
                              onChange={(e) => setEditPlaylistName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSavePlaylistName();
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              className="playlist-edit-input"
                              autoFocus
                            />
                            <div className="playlist-edit-actions">
                              <button
                                onClick={handleSavePlaylistName}
                                className="btn btn-primary btn-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="btn btn-ghost btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="playlist-card-title">{playlist.name}</h3>
                            <p className="playlist-card-subtitle">
                              {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
                            </p>
                          </>
                        )}
                      </div>

                      {editingPlaylist !== playlist.id && (
                        <div className="playlist-card-actions" style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowPlaylistActions(
                              showPlaylistActions === playlist.id ? null : playlist.id
                            )}
                            className="btn btn-ghost btn-icon btn-sm"
                            aria-label="More options"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>

                          <PlaylistMenu
                            playlist={playlist}
                            isOpen={showPlaylistActions === playlist.id}
                            onClose={() => setShowPlaylistActions(null)}
                            onRename={(p: Playlist) => handleEditPlaylist(p.id, p.name)}
                            onExport={(id: string) => handleExportPlaylist(id)}
                            onDelete={(p: Playlist) => handleDeletePlaylist(p.id, p.name)}
                          />
                        </div>
                      )}
                    </div>

                    {playlist.tracks.length > 0 && (
                      <div className="playlist-card-content">
                        <TrackListModern
                          tracks={playlist.tracks}
                          showAddToPlaylist={false}
                          playlistId={playlist.id}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className={`app-main ${isSidebarOpen ? 'app-main-with-sidebar' : 'app-main-full'}`}>
        <header className="app-header">
          <button
            onClick={toggleSidebar}
            className="btn btn-ghost btn-icon mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1 className="app-title" style={{ color: '#ffffff !important' }}>Notify Music Player</h1>

          <div className="header-search-container">
            <SearchBar />
          </div>

          <div className="header-actions">
            <a
              href="https://github.com/Nishantnsut27"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              aria-label="Visit GitHub Profile"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </header>

        <div className="app-content">
          <div className="spotify-gradient-overlay"></div>
          {renderMainContent()}
        </div>
      </main>

      <PlayerControls />

      {playlistToRename && (
        <ConfirmModal
          isOpen={!!playlistToRename}
          title="Rename Playlist"
          message={`Enter a new name for "${playlistToRename.name}":`}
          confirmText="Save Name"
          cancelText="Cancel"
          variant="primary"
          showInput={true}
          inputValue={renameInput}
          inputPlaceholder="Playlist name"
          onInputChange={setRenameInput}
          onConfirm={confirmRenamePlaylist}
          onCancel={() => {
            setPlaylistToRename(null);
            setRenameInput('');
          }}
        />
      )}

      {playlistToDelete && (
        <ConfirmModal
          isOpen={!!playlistToDelete}
          title="Delete Playlist"
          message={`Are you sure you want to delete "${playlistToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete Playlist"
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmDeletePlaylist}
          onCancel={() => setPlaylistToDelete(null)}
        />
      )}

      {showClearFavoritesModal && (
        <ConfirmModal
          isOpen={showClearFavoritesModal}
          title="Clear All Favorites"
          message="Are you sure you want to remove all tracks from your favorites?"
          confirmText="Clear All"
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmClearFavorites}
          onCancel={() => setShowClearFavoritesModal(false)}
        />
      )}

      <ToastContainer />
    </div>
  );
}

export default function RootApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
