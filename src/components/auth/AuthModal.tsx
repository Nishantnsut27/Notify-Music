import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

export type AuthMode = 'login' | 'signup';

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

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Handle Escape key & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap cycling inside active face
      if (e.key === 'Tab' && modalRef.current) {
        const activeCardFace = modalRef.current.querySelector<HTMLElement>(
          mode === 'signup' ? '.auth-card-back' : '.auth-card-front'
        );
        if (!activeCardFace) return;

        const focusableElements = activeCardFace.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on opening active face input
    setTimeout(() => {
      if (modalRef.current) {
        const activeFace = modalRef.current.querySelector<HTMLElement>(
          mode === 'signup' ? '.auth-card-back' : '.auth-card-front'
        );
        const firstInput = activeFace?.querySelector<HTMLInputElement>('input');
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, onClose]);

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
        <div className={`auth-card-flipper ${mode === 'signup' ? 'is-flipped' : ''}`}>
          
          {/* Front Face: Log In */}
          <div className="auth-card-face auth-card-front">
            <button
              className="auth-modal-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close authentication modal and return to guest mode"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <LoginForm
              onSwitchToSignup={() => onModeChange('signup')}
              onSuccess={onAuthSuccess}
            />
          </div>

          {/* Back Face: Sign Up */}
          <div className="auth-card-face auth-card-back">
            <button
              className="auth-modal-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close authentication modal and return to guest mode"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <SignupForm
              onSwitchToLogin={() => onModeChange('login')}
              onSuccess={onAuthSuccess}
            />
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
