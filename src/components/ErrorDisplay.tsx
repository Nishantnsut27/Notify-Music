import { useState, useEffect } from 'react';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title = "Playback or Connection Error",
  message = "We encountered a problem loading music. Please check your connection and try again.",
  onRetry,
  onDismiss,
  className = "",
}: ErrorDisplayProps) {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const displayTitle = !isOnline ? "You're Currently Offline" : title;
  const displayMessage = !isOnline
    ? "Internet connection lost. Please reconnect to stream music and search for songs."
    : message;

  return (
    <div className={`error-display-card ${className}`}>
      <div className="error-display-icon">
        {!isOnline ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        )}
      </div>

      <h3 className="error-display-title">{displayTitle}</h3>
      <p className="error-display-message">{displayMessage}</p>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-primary error-retry-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23,4 23,10 17,10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Try Again
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="btn btn-ghost" style={{ padding: '6px 16px' }}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
