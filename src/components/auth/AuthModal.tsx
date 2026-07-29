import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export type AuthMode = 'login' | 'signup' | 'forgotPassword';

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (newMode: AuthMode) => void;
  onAuthSuccess?: (userEmail: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  onClose,
  onModeChange,
  onAuthSuccess,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedMode, setSelectedMode] = useState<AuthMode>(mode);

  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const container = selectedMode === 'forgotPassword'
          ? modalRef.current.querySelector('.forgot-password-form')
          : modalRef.current.querySelector(
              selectedMode === 'signup' ? '.auth-card-back' : '.auth-card-front'
            );
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    setTimeout(() => {
      if (modalRef.current) {
        const container = selectedMode === 'forgotPassword'
          ? modalRef.current.querySelector('.forgot-password-form')
          : modalRef.current.querySelector(
              selectedMode === 'signup' ? '.auth-card-back' : '.auth-card-front'
            );
        const firstInput = container?.querySelector<HTMLInputElement>('input');
        firstInput?.focus();
      }
    }, 100);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedMode, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="auth-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="auth-card-scene"
        onClick={(e) => e.stopPropagation()}
      >
        {selectedMode === 'forgotPassword' ? (
          <div className="auth-card-face">
            <button
              className="auth-modal-close-btn"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              aria-label="Close"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <ForgotPasswordForm
              onBackToLogin={() => {
                setSelectedMode('login');
                onModeChange('login');
              }}
              onSuccess={() => {
                setSelectedMode('login');
                onModeChange('login');
              }}
            />
          </div>
        ) : (
          <div className={`auth-card-flipper ${selectedMode === 'signup' ? 'is-flipped' : ''}`}>
            <div className="auth-card-face auth-card-front">
              <button
                className="auth-modal-close-btn"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label="Close"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <LoginForm
                onSwitchToSignup={() => {
                  setSelectedMode('signup');
                  onModeChange('signup');
                }}
                onForgotPassword={() => {
                  setSelectedMode('forgotPassword');
                  onModeChange('forgotPassword');
                }}
                onSuccess={onAuthSuccess}
              />
            </div>
            <div className="auth-card-face auth-card-back">
              <button
                className="auth-modal-close-btn"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label="Close"
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <SignupForm
                onSwitchToLogin={() => {
                  setSelectedMode('login');
                  onModeChange('login');
                }}
                onSuccess={onAuthSuccess}
              />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
