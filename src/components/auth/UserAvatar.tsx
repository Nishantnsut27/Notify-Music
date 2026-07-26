import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface UserAvatarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ isOpen, onToggle }) => {
  const { user, isAuthenticated } = useAuthStore();

  const displayName = isAuthenticated && user ? user.fullName.split(' ')[0] : 'Guest';

  return (
    <div className="user-avatar-wrapper">
      <button
        type="button"
        className={`user-avatar-btn ${isOpen ? 'is-active' : ''}`}
        onClick={onToggle}
        aria-label="User account and profile settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="user-avatar-icon-container">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span
            className={`user-avatar-badge-dot ${isAuthenticated ? 'is-authenticated' : ''}`}
            title={isAuthenticated ? 'Logged in' : 'Guest status'}
          />
        </div>
        
        <span className="user-avatar-label">{displayName}</span>

        <svg
          className="user-avatar-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
};
