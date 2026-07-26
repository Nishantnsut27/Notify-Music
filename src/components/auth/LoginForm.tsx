import React, { useState } from 'react';
import { PasswordInput } from './PasswordInput';
import { useAuthStore } from '../../store/authStore';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSuccess?: (userEmail: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToSignup, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const { login, isLoading, error: storeError, clearError } = useAuthStore();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setInfoMessage('Password reset link will be sent to your registered email.');
    setTimeout(() => setInfoMessage(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setInfoMessage(null);

    if (!validateForm()) return;

    const success = await login({ email, password });
    if (success) {
      if (onSuccess) {
        onSuccess(email);
      }
    }
  };

  return (
    <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
      {/* Top Silhouette Profile Avatar (Matching Image 3) */}
      <div className="auth-silhouette-avatar">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>

      {storeError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>{storeError}</div>
        </div>
      )}

      {infoMessage && (
        <div className="auth-alert auth-alert-info" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>{infoMessage}</div>
        </div>
      )}

      {/* Email Input Field with Left Envelope Icon */}
      <div className="auth-glass-field">
        <div className="auth-input-wrapper">
          <span className="auth-input-icon-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
          <input
            id="login-email"
            name="email"
            type="email"
            className={`auth-glass-input ${errors.email ? 'is-invalid' : ''}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              if (storeError) clearError();
            }}
            placeholder="Email ID"
            disabled={isLoading}
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && (
          <span className="auth-field-error" role="alert">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errors.email}
          </span>
        )}
      </div>

      {/* Password Input Field with Left Lock Icon & Right Eye Toggle */}
      <PasswordInput
        id="login-password"
        name="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          if (storeError) clearError();
        }}
        placeholder="Password"
        error={errors.password}
        disabled={isLoading}
        autoComplete="current-password"
      />

      {/* Checkbox and Forgot Password Link side-by-side matching Image 3 */}
      <div className="auth-glass-options">
        <label className="auth-glass-checkbox-label">
          <input
            type="checkbox"
            className="auth-glass-checkbox-input"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <span className="auth-glass-checkbox-custom">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Remember me
        </label>

        <button
          type="button"
          className="auth-forgot-link"
          onClick={handleForgotPassword}
          disabled={isLoading}
        >
          Forgot Password?
        </button>
      </div>

      {/* LOGIN Pill Action Button */}
      <button type="submit" className="auth-glass-btn" disabled={isLoading}>
        {isLoading ? (
          <>
            <svg className="auth-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            LOGGING IN...
          </>
        ) : (
          'LOGIN'
        )}
      </button>

      {/* Bottom Card Flip Switch Prompt */}
      <div className="auth-flip-trigger-footer">
        Don't have an account?
        <button
          type="button"
          className="auth-flip-trigger-btn"
          onClick={() => {
            clearError();
            onSwitchToSignup();
          }}
          disabled={isLoading}
        >
          Sign Up
        </button>
      </div>
    </form>
  );
};
