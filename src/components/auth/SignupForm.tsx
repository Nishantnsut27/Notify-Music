import React, { useState } from 'react';
import { PasswordInput } from './PasswordInput';
import { useAuthStore } from '../../store/authStore';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: (userEmail: string) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const { signup, isLoading, error: storeError, clearError } = useAuthStore();

  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', className: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', className: 'strength-weak' };
      case 2:
        return { score: 2, label: 'Fair', className: 'strength-fair' };
      case 3:
        return { score: 3, label: 'Good', className: 'strength-good' };
      case 4:
        return { score: 4, label: 'Strong', className: 'strength-strong' };
      default:
        return { score: 0, label: '', className: '' };
    }
  };

  const strengthInfo = calculatePasswordStrength(password);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirming password is required';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must accept the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) return;

    const success = await signup({ fullName, email, password });
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{storeError}</span>
        </div>
      )}

      {/* Full Name Field with Left User Icon */}
      <div className="auth-glass-field">
        <div className="auth-input-wrapper">
          <span className="auth-input-icon-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <input
            id="signup-name"
            name="fullName"
            type="text"
            className={`auth-glass-input ${errors.fullName ? 'is-invalid' : ''}`}
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              if (storeError) clearError();
            }}
            placeholder="Full Name"
            disabled={isLoading}
            autoComplete="name"
            aria-invalid={!!errors.fullName}
          />
        </div>
        {errors.fullName && (
          <span className="auth-field-error" role="alert">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errors.fullName}
          </span>
        )}
      </div>

      {/* Email Field with Left Envelope Icon */}
      <div className="auth-glass-field">
        <div className="auth-input-wrapper">
          <span className="auth-input-icon-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </span>
          <input
            id="signup-email"
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

      {/* Password Field */}
      <PasswordInput
        id="signup-password"
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
        autoComplete="new-password"
      />

      {password.length > 0 && (
        <div className="password-strength-container">
          <div className="password-strength-bars">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`password-strength-bar ${
                  strengthInfo.score >= step ? strengthInfo.className : ''
                }`}
              />
            ))}
          </div>
          <div className="password-strength-label">
            <span>Strength:</span>
            <span className={`strength-text ${strengthInfo.className}`}>
              {strengthInfo.label}
            </span>
          </div>
        </div>
      )}

      {/* Confirm Password Field */}
      <PasswordInput
        id="signup-confirm-password"
        name="confirmPassword"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          if (storeError) clearError();
        }}
        placeholder="Confirm Password"
        error={errors.confirmPassword}
        disabled={isLoading}
        autoComplete="new-password"
      />

      {/* Terms Checkbox */}
      <div className="auth-glass-field">
        <label className="auth-glass-checkbox-label">
          <input
            type="checkbox"
            className="auth-glass-checkbox-input"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
            }}
            disabled={isLoading}
          />
          <span className="auth-glass-checkbox-custom">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          I agree to the Terms & Privacy Policy
        </label>
        {errors.terms && (
          <span className="auth-field-error" role="alert">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errors.terms}
          </span>
        )}
      </div>

      {/* SIGN UP Pill Action Button */}
      <button type="submit" className="auth-glass-btn" disabled={isLoading}>
        {isLoading ? (
          <>
            <svg className="auth-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            CREATING ACCOUNT...
          </>
        ) : (
          'SIGN UP'
        )}
      </button>

      {/* Bottom Card Flip Switch Prompt */}
      <div className="auth-flip-trigger-footer">
        Already have an account?
        <button
          type="button"
          className="auth-flip-trigger-btn"
          onClick={() => {
            clearError();
            onSwitchToLogin();
          }}
          disabled={isLoading}
        >
          Log In
        </button>
      </div>
    </form>
  );
};
