import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'success';
  showInput?: boolean;
  inputValue?: string;
  inputPlaceholder?: string;
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  showInput = false,
  inputValue = '',
  inputPlaceholder = '',
  onInputChange,
  onConfirm,
  onCancel,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  /* Callers pass inline handlers, so the key listener reads the latest one
     through a ref instead of re-subscribing (and re-restoring focus) on every
     parent render. */
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  /* No global Enter-to-confirm: Enter activates whichever button has focus, so
     it cannot confirm a destructive action while the listener is on Cancel. */
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !container.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      (showInput ? inputRef.current : confirmRef.current)?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, showInput]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success' || title.toLowerCase().includes('imported') || title.toLowerCase().includes('success');

  const getIconClass = () => {
    if (isDanger) return 'icon-danger';
    if (isSuccess) return 'icon-success';
    return 'icon-primary';
  };

  const renderModalIcon = () => {
    if (isDanger) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    }
    if (isSuccess) {
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    }
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  };

  return createPortal(
    <div
      className="confirm-modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="confirm-modal-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon ${getIconClass()}`}>
            {renderModalIcon()}
          </div>
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h3>
          <button
            type="button"
            className="confirm-modal-close"
            onClick={onCancel}
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="confirm-modal-body">
          <p className="confirm-modal-message">{message}</p>
          {showInput && (
            <input
              ref={inputRef}
              type="text"
              className="confirm-modal-input"
              value={inputValue}
              placeholder={inputPlaceholder}
              onChange={(e) => onInputChange && onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (inputValue.trim()) onConfirm();
                }
              }}
            />
          )}
        </div>

        <div className="confirm-modal-actions">
          <button className="btn btn-ghost confirm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            className={`btn ${isDanger ? 'confirm-btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={showInput && !inputValue.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
