import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { usePlayerStore } from '../../store/playerStore';
import { useToastStore } from '../../store/toastStore';

interface UserDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal: (mode: 'login' | 'signup') => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionItemRef = useRef<HTMLButtonElement>(null);

  const { user, isAuthenticated, logout } = useAuthStore();
  const { setCurrentView } = usePlayerStore();
  const { addToast } = useToastStore();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation (Esc to close, auto focus)
  useEffect(() => {
    if (!isOpen) return;

    setTimeout(() => {
      actionItemRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavClick = (view: 'search' | 'playlists' | 'favorites' | 'recently-played' | 'history') => {
    onClose();
    setCurrentView(view);
  };

  const handleShowAccount = () => {
    onClose();
    addToast({
      title: 'Account Information',
      message: `Logged in as ${user?.fullName || 'User'} (${user?.email}). Cloud sync status: Active.`,
      type: 'info',
    });
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    addToast({ message: 'Logged out successfully. Reverted to Guest Mode.', type: 'info' });
  };

  return (
    <div
      ref={dropdownRef}
      className="user-dropdown-menu"
      role="menu"
      aria-orientation="vertical"
      aria-label="User Account Menu"
    >
      {/* Header Info */}
      <div className="user-dropdown-header">
        <div className="user-dropdown-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>
        <div className="user-dropdown-info">
          {isAuthenticated && user ? (
            <>
              <div className="user-dropdown-title">
                {user.fullName}
              </div>
              <span className="user-dropdown-subtitle">{user.email}</span>
            </>
          ) : (
            <>
              <div className="user-dropdown-title">
                Guest User
                <span className="guest-pill-badge">Guest</span>
              </div>
              <span className="user-dropdown-subtitle">Listening in guest mode</span>
            </>
          )}
        </div>
      </div>

      <div className="user-dropdown-divider" />

      {/* Navigation Shortcut Menu Items */}
      {isAuthenticated ? (
        <>
          <button
            ref={actionItemRef}
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={handleShowAccount}
          >
            <span className="user-dropdown-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            View Profile / Account
          </button>

          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => handleNavClick('favorites')}
          >
            <span className="user-dropdown-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </span>
            Liked Songs
          </button>

          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => handleNavClick('playlists')}
          >
            <span className="user-dropdown-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            Your Library
          </button>

          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => handleNavClick('recently-played')}
          >
            <span className="user-dropdown-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            Recently Played
          </button>

          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => handleNavClick('history')}
          >
            <span className="user-dropdown-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </span>
            Listening History
          </button>

          <div className="user-dropdown-divider" />

          <button
            type="button"
            className="user-dropdown-item text-danger"
            role="menuitem"
            onClick={handleLogout}
          >
            <span className="user-dropdown-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            Log Out
          </button>
        </>
      ) : (
        <button
          ref={actionItemRef}
          type="button"
          className="user-dropdown-item"
          role="menuitem"
          onClick={() => {
            onClose();
            onOpenAuthModal('login');
          }}
        >
          <span className="user-dropdown-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </span>
          Login / Sign Up
        </button>
      )}
    </div>
  );
};
