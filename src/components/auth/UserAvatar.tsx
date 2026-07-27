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
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          outline: 'none'
        }}
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
        </div>
        
        <span className="user-avatar-label">{displayName}</span>
      </button>
    </div>
  );
};
