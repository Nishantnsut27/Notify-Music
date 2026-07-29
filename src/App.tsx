import { useEffect, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { TrackListModern } from './components/TrackListModern';
import { PlayerControls } from './components/PlayerControls';
import { Sidebar } from './components/Sidebar';
import { ConfirmModal } from './components/ConfirmModal';
import { PlaylistMenu } from './components/PlaylistMenu';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorDisplay } from './components/ErrorDisplay';
import { EmptyFavorites, EmptyPlaylists, EmptyRecentlyPlayed } from './components/EmptyState';
import { PersonalizedHome } from './components/PersonalizedHome';
import { ArtistPage } from './components/ArtistPage';
import { AlbumPage } from './components/AlbumPage';
import { RelatedMusic } from './components/RelatedMusic';
import { DiscoverySection } from './components/DiscoverySection';
import { usePlayerStore } from './store/playerStore';
import { useToastStore } from './store/toastStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRecommendations } from './hooks/useRecommendations';
import { MusicAPI } from './services/musicApi';
import type { Playlist } from './types/types';

import { UserAvatar } from './components/auth/UserAvatar';
import { UserDropdown } from './components/auth/UserDropdown';
import { AuthModal, type AuthMode } from './components/auth/AuthModal';
import { useAuthStore } from './store/authStore';

import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/player.css';
import './styles/animations.css';
import './styles/auth.css';

function App() {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');

  const { isAuthenticated, checkAuth } = useAuthStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent<AuthMode>;
      if (customEvent.detail) {
        setAuthModalMode(customEvent.detail);
      }
      setIsAuthModalOpen(true);
    };

    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  const [showPlaylistActions, setShowPlaylistActions] = useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null);
  const [editPlaylistName, setEditPlaylistName] = useState('');
  const [playlistToRename, setPlaylistToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showClearFavoritesModal, setShowClearFavoritesModal] = useState(false);

  const {
    currentView,
    setCurrentView,
    isSidebarOpen,
    results,
    isLoading,
    error,
    trending,
    playlists,
    favorites,
    recentlyPlayed,
    clearFavorites,
    setTrending,
    setLoading,
    setError,
    toggleSidebar,
    deletePlaylist,
    renamePlaylist,
    currentArtistId,
    currentArtistName,
    currentAlbumId,
    currentAlbumName,
  } = usePlayerStore();

  useKeyboardShortcuts();
  useRecommendations();

  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname.toLowerCase();
      const isAuth = useAuthStore.getState().isAuthenticated;

      const isProtectedRoute =
        path.includes('/favorites') ||
        path.includes('/playlists') ||
        path.includes('/recent');

      if (!isAuth && isProtectedRoute) {
        usePlayerStore.getState().setCurrentView('search');
        try {
          window.history.replaceState(null, '', '/');
        } catch {
          // Ignore state error
        }
        return;
      }

      if (path.includes('/favorites')) {
        usePlayerStore.getState().setCurrentView('favorites');
      } else if (path.includes('/playlists')) {
        usePlayerStore.getState().setCurrentView('playlists');
      } else if (path.includes('/recent')) {
        usePlayerStore.getState().setCurrentView('recent');
      } else if (path.includes('/artist')) {
        const parts = path.split('/');
        const artistIdx = parts.indexOf('artist');
        if (artistIdx >= 0 && parts[artistIdx + 1]) {
          usePlayerStore.getState().navigateToArtist(decodeURIComponent(parts[artistIdx + 1]), decodeURIComponent(parts[artistIdx + 1]));
        }
      } else if (path.includes('/album')) {
        const parts = path.split('/');
        const albumIdx = parts.indexOf('album');
        if (albumIdx >= 0 && parts[albumIdx + 1]) {
          usePlayerStore.getState().navigateToAlbum(decodeURIComponent(parts[albumIdx + 1]), decodeURIComponent(parts[albumIdx + 1]));
        }
      } else if (path === '/' || path.includes('/search')) {
        usePlayerStore.getState().setCurrentView('search');
      }
    };

    handleUrlRouting();
    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  // Protected Route Guard Effect: Redirect guest users attempting to view protected views
  useEffect(() => {
    const protectedViews = ['favorites', 'playlists', 'recent'];
    if (!isAuthenticated && protectedViews.includes(currentView)) {
      setCurrentView('search');
      addToast({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please log in to access your personal library, favorites, and history.',
      });
      setIsAuthModalOpen(true);
      setAuthModalMode('login');
    }
  }, [isAuthenticated, currentView, setCurrentView, addToast]);

  useEffect(() => {
    let targetPath = '/';
    if (currentView === 'search') targetPath = '/';
    else if (currentView === 'artist') targetPath = `/artist/${encodeURIComponent(currentArtistId || currentArtistName || '')}`;
    else if (currentView === 'album') targetPath = `/album/${encodeURIComponent(currentAlbumId || currentAlbumName || '')}`;
    else targetPath = `/${currentView}`;
    if (window.location.pathname !== targetPath) {
      try {
        window.history.pushState(null, '', targetPath);
      } catch (e) {
        void e;
      }
    }
  }, [currentView, currentArtistId, currentArtistName, currentAlbumId, currentAlbumName]);

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
    const playlist = playlists.find((p) => p.id === playlistId);
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
          if (import.meta.env.DEV) console.log('🎵 Loading trending music tracks...');
          const tracks = await MusicAPI.getTrendingTracks(25);
          setTrending(tracks);
          if (import.meta.env.DEV) console.log('✅ Loaded trending tracks:', tracks.length);
        } catch (error) {
          console.error('❌ Failed to load trending tracks:', error);
          const errorMsg =
            error instanceof Error
              ? error.message
              : '🎪 Trending tracks are temporarily unavailable. Try searching for specific genres like rap, electronic, or jazz.';
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
        if (isAuthenticated) {
          return (
            <div className="view-container">
              <PersonalizedHome />
              <DiscoverySection />
              <RelatedMusic />
            </div>
          );
        }
        return (
          <div className="view-container">
            <div className="content-search-container">
              <SearchBar />
            </div>
            {error ? (
              <div style={{ margin: '16px 0' }}>
                <ErrorDisplay
                  title="Music Temporarily Unavailable"
                  message={error}
                  onRetry={() => {
                    setError(null);
                    const q = usePlayerStore.getState().query;
                    if (q) {
                      setLoading(true);
                      MusicAPI.searchTracks(q)
                        .then((res) => {
                          usePlayerStore.getState().setResults(res);
                        })
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
                        })
                        .finally(() => setLoading(false));
                    } else {
                      window.location.reload();
                    }
                  }}
                  onDismiss={() => setError(null)}
                />
              </div>
            ) : results.length > 0 || usePlayerStore.getState().query ? (
              <SearchResults tracks={results} query={usePlayerStore.getState().query} isLoading={isLoading} />
            ) : (
              <div>
                <TrackListModern
                  tracks={trending}
                  title="Trending Songs"
                  isLoading={isLoading}
                />
                <RelatedMusic />
              </div>
            )}
          </div>
        );

      case 'artist':
        return <ArtistPage />;

      case 'album':
        return <AlbumPage />;

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
              <TrackListModern tracks={favorites} showAddToPlaylist={true} />
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
                  <div
                    key={playlist.id}
                    className={`playlist-card ${showPlaylistActions === playlist.id ? 'menu-open' : ''}`}
                  >
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
                              <button onClick={handleSavePlaylistName} className="btn btn-primary btn-sm">
                                Save
                              </button>
                              <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm">
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
                            onClick={() =>
                              setShowPlaylistActions(showPlaylistActions === playlist.id ? null : playlist.id)
                            }
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

      case 'recent':
        return (
          <div className="view-container">
            <div className="page-header">
              <h1 className="page-title">Recently Played</h1>
              <p className="page-subtitle">
                {recentlyPlayed.length} {recentlyPlayed.length === 1 ? 'track' : 'tracks'} played recently
              </p>
            </div>

            {recentlyPlayed.length === 0 ? (
              <EmptyRecentlyPlayed
                onBrowse={() => {
                  usePlayerStore.getState().setCurrentView('search');
                }}
              />
            ) : (
              <TrackListModern tracks={recentlyPlayed} showAddToPlaylist={true} />
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

          <h1 className="app-title" style={{ color: '#ffffff !important' }}>
            Notify Music
          </h1>

          <div className="header-search-container">
            <SearchBar />
          </div>

          <div className="header-actions">
            <div style={{ position: 'relative' }}>
              <UserAvatar
                isOpen={isUserDropdownOpen}
                onToggle={() => setIsUserDropdownOpen((prev) => !prev)}
              />
              <UserDropdown
                isOpen={isUserDropdownOpen}
                onClose={() => setIsUserDropdownOpen(false)}
                onOpenAuthModal={(mode) => {
                  setAuthModalMode(mode);
                  setIsAuthModalOpen(true);
                }}
              />
            </div>
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

      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onModeChange={(newMode) => setAuthModalMode(newMode)}
        onAuthSuccess={(email) => {
          setIsAuthModalOpen(false);
          addToast({ message: `Authenticated successfully! Welcome ${email}`, type: 'success' });
        }}
      />

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
