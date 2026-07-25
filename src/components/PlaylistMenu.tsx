import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Playlist } from '../types/types';

interface PlaylistMenuProps {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
  onRename: (playlist: Playlist) => void;
  onExport: (playlistId: string) => void;
  onDelete: (playlist: Playlist) => void;
  align?: 'left' | 'right';
}

export const PlaylistMenu: React.FC<PlaylistMenuProps> = ({
  playlist,
  isOpen,
  onClose,
  onRename,
  onExport,
  onDelete,
  align = 'right',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen && !isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, isMobile, onClose]);

  useEffect(() => {
    if (isOpen && isMobile) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, isMobile, onClose]);

  if (!isOpen) return null;

  if (isMobile) {
    return createPortal(
      <div 
        className="playlist-mobile-actions-overlay" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <div 
          className="playlist-mobile-actions-sheet" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="playlist-mobile-sheet-header">
            <div className="playlist-mobile-sheet-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
              </svg>
            </div>
            <div className="playlist-mobile-sheet-info">
              <h4 className="playlist-mobile-sheet-title">{playlist.name}</h4>
              <p className="playlist-mobile-sheet-subtitle">{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}</p>
            </div>
            <button className="playlist-mobile-sheet-close" onClick={onClose} aria-label="Close menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="playlist-mobile-sheet-body">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename(playlist);
                onClose();
              }}
              className="playlist-mobile-sheet-item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit Name</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport(playlist.id);
                onClose();
              }}
              className="playlist-mobile-sheet-item"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Export Playlist</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(playlist);
                onClose();
              }}
              className="playlist-mobile-sheet-item playlist-mobile-sheet-delete"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6" />
                <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              <span>Delete Playlist</span>
            </button>
          </div>

          <div className="playlist-mobile-sheet-footer">
            <button onClick={onClose} className="playlist-mobile-sheet-cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div
      ref={menuRef}
      className={`playlist-actions-menu ${align === 'left' ? 'align-left' : 'align-right'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRename(playlist);
          onClose();
        }}
        className="playlist-action-item"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Name
      </button>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExport(playlist.id);
          onClose();
        }}
        className="playlist-action-item"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Export Playlist
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(playlist);
          onClose();
        }}
        className="playlist-action-item playlist-action-delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3,6 5,6 21,6" />
          <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        Delete Playlist
      </button>
    </div>
  );
};
