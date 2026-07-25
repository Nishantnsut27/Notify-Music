import { useEffect } from 'react';
import { useToastStore, type ToastMessage, type ToastType } from '../store/toastStore';

function ToastItem({ toast }: { toast: ToastMessage }) {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  const getIcon = (type: ToastType, title?: string, message?: string) => {
    const isFavoriteToast = title?.toLowerCase().includes('favorite');
    const isNowPlaying = title?.toLowerCase().includes('playing');
    const isRemovedToast = title?.toLowerCase().includes('remove') || message?.toLowerCase().includes('remove');

    if (isRemovedToast) {
      return (
        <div className="toast-icon-badge toast-badge-remove">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
      );
    }

    if (isFavoriteToast) {
      return (
        <div className="toast-icon-badge toast-badge-favorite">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#e22134" stroke="#e22134" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      );
    }

    if (isNowPlaying) {
      return (
        <div className="toast-icon-badge toast-badge-music">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1ed760" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      );
    }

    switch (type) {
      case 'success':
        return (
          <div className="toast-icon-badge toast-badge-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="toast-icon-badge toast-badge-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="toast-icon-badge toast-badge-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <circle cx="12" cy="17" r="1" fill="#000000" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="toast-icon-badge toast-badge-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <circle cx="12" cy="8" r="1" fill="#ffffff" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className={`toast-item toast-${toast.type}`} role="status" aria-live="polite">
      {getIcon(toast.type, toast.title, toast.message)}
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="toast-close-btn"
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
