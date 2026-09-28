import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { XIcon } from './AuthIcons';
import { useAuthStore } from '../../store/authStore';
import { usePlayerStore } from '../../store/playerStore';
import { FALLBACK_ART, showFallbackArt } from '../../utils/artwork';
import type { Track } from '../../types/types';

export type AuthMode = 'login' | 'signup' | 'forgotPassword';

const coverOf = (track: Track | null | undefined): string => {
  const src = track?.image || track?.album_image || '';
  return src && !src.includes('placeholder') ? src : '';
};

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (newMode: AuthMode) => void;
  onAuthSuccess?: (userEmail: string) => void;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const TITLE_IDS: Record<AuthMode, string> = {
  login: 'auth-login-title',
  signup: 'auth-signup-title',
  forgotPassword: 'auth-forgot-title',
};

// The inactive login/signup panel stays mounted (so typed values survive a tab
// switch) but is `hidden` + `inert`, so it must be excluded from the trap.
const getFocusable = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.closest('[hidden], [inert]') && !el.matches(':disabled')
  );

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  onClose,
  onModeChange,
  onAuthSuccess,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const [selectedMode, setSelectedMode] = useState<AuthMode>(mode);
  const clearError = useAuthStore((state) => state.clearError);

  // The scene behind the card is built from what the listener is (or was just) hearing,
  // falling back to what's trending, so signing in feels like part of the music.
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const lastPlayed = usePlayerStore((state) => state.recentlyPlayed[0]);
  const topTrending = usePlayerStore((state) => state.trending[0]);
  const scene = currentTrack
    ? { track: currentTrack, eyebrow: isPlaying ? 'Now playing' : 'Continue listening', live: isPlaying }
    : lastPlayed
      ? { track: lastPlayed, eyebrow: 'Pick up where you left off', live: false }
      : topTrending
        ? { track: topTrending, eyebrow: 'Trending on Soundrift', live: false }
        : null;
  const sceneArt = coverOf(scene?.track);

  const view: AuthMode = selectedMode === 'signup' || selectedMode === 'forgotPassword' ? selectedMode : 'login';

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
    const activePanel = modalRef.current?.querySelector('.auth-panel:not([hidden])');
    const firstInput = activePanel?.querySelector<HTMLInputElement>('input');
    firstInput?.focus();
  }, [isOpen, selectedMode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = getFocusable(modalRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!modalRef.current.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
          return;
        }
        if (e.shiftKey) {
          if (active === first) { e.preventDefault(); last.focus(); }
        } else {
          if (active === last) { e.preventDefault(); first.focus(); }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const switchMode = (newMode: AuthMode) => {
    setSelectedMode(newMode);
    onModeChange(newMode);
  };

  const handleTabClick = (tab: 'login' | 'signup') => {
    if (tab === view) return;
    clearError();
    switchMode(tab);
  };

  return createPortal(
    <div
      className={`auth-modal-backdrop auth-scene${sceneArt ? ' has-art' : ''}`}
      // Closing only when the press also started here keeps a text selection dragged out of an input from dismissing the form.
      onPointerDown={(e) => { pressStartedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (pressStartedOnBackdrop.current && e.target === e.currentTarget) onClose();
        pressStartedOnBackdrop.current = false;
      }}
    >
      <div className="auth-ambient" aria-hidden="true">
        {sceneArt && (
          <div className="auth-ambient-art" style={{ backgroundImage: `url("${sceneArt.replace(/"/g, '%22')}")` }} />
        )}
        <div className="auth-ambient-aurora" />
        <div className="auth-ambient-shade" />
      </div>

      <div className="auth-stage">
        {scene && (
          <div className="auth-now-playing" aria-hidden="true">
            <img className="auth-now-playing-art" src={sceneArt || FALLBACK_ART} onError={showFallbackArt} alt="" width={44} height={44} />
            <span className="auth-now-playing-text">
              <span className="auth-now-playing-eyebrow">{scene.eyebrow}</span>
              <span className="auth-now-playing-title">{scene.track.name}</span>
              <span className="auth-now-playing-artist">{scene.track.artist_name}</span>
            </span>
            {scene.live && <span className="auth-eq is-live"><i /><i /><i /><i /></span>}
          </div>
        )}

        <div
          ref={modalRef}
          className="auth-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={TITLE_IDS[view]}
        >
          <div className="auth-modal-header">
            <div className="auth-brand">
              <img src="/Favicon.png" alt="" width="32" height="32" className="auth-brand-logo" />
              <span className="auth-brand-name">Soundrift</span>
            </div>
            <button
              className="auth-modal-close-btn"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              aria-label="Close"
              type="button"
            >
              <XIcon size={18} />
            </button>
          </div>

          {view === 'forgotPassword' ? (
            <div className="auth-panel">
              <ForgotPasswordForm
                onBackToLogin={() => switchMode('login')}
                onSuccess={() => switchMode('login')}
              />
            </div>
          ) : (
            <>
              <div className="auth-tabs" role="tablist" aria-label="Log in or sign up" data-active={view}>
                <button
                  type="button"
                  role="tab"
                  id="auth-tab-login"
                  className="auth-tab"
                  aria-selected={view === 'login'}
                  aria-controls="auth-panel-login"
                  onClick={() => handleTabClick('login')}
                >
                  Log in
                </button>
                <button
                  type="button"
                  role="tab"
                  id="auth-tab-signup"
                  className="auth-tab"
                  aria-selected={view === 'signup'}
                  aria-controls="auth-panel-signup"
                  onClick={() => handleTabClick('signup')}
                >
                  Sign up
                </button>
              </div>

              <div
                id="auth-panel-login"
                role="tabpanel"
                aria-labelledby="auth-tab-login"
                className="auth-panel"
                hidden={view !== 'login'}
                inert={view !== 'login'}
              >
                <LoginForm
                  onSwitchToSignup={() => switchMode('signup')}
                  onForgotPassword={() => switchMode('forgotPassword')}
                  onSuccess={onAuthSuccess}
                />
              </div>

              <div
                id="auth-panel-signup"
                role="tabpanel"
                aria-labelledby="auth-tab-signup"
                className="auth-panel"
                hidden={view !== 'signup'}
                inert={view !== 'signup'}
              >
                <SignupForm
                  onSwitchToLogin={() => switchMode('login')}
                  onSuccess={onAuthSuccess}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
