import React, { useState } from 'react';
import { PasswordInput } from './PasswordInput';
import { OtpInput } from './OtpInput';
import { AuthTextField } from './AuthTextField';
import { useAuthStore } from '../../store/authStore';
import { MailIcon, CheckIcon, AlertCircleIcon, LoaderIcon, GoogleIcon, TimerIcon, ArrowLeftIcon } from './AuthIcons';
import { authApi } from '../../services/authApi';
import { ApiError } from '../../services/apiClient';
import { useCountdown } from '../../hooks/useCountdown';

const handleGoogleLogin = () => {
  window.location.href = authApi.getGoogleAuthUrl();
};

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
  onSuccess?: (userEmail: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { login, isLoading, error: storeError, clearError } = useAuthStore();
  const { countdown, startCountdown, isActive: isTimerActive } = useCountdown(60);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) newErrors.email = 'Email address is required';
    else if (!emailRegex.test(email.trim())) newErrors.email = 'Please enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validateForm()) return;
    const success = await login({ email, password, rememberMe });
    if (success) {
      onSuccess?.(email);
      return;
    }
    if (useAuthStore.getState().errorCode === 'EMAIL_NOT_VERIFIED') {
      clearError();
      setOtp('');
      setOtpError(null);
      setNeedsVerification(true);
      startCountdown();
    }
  };

  const handleVerifyAndLogin = async () => {
    setOtpError(null);
    if (otp.length !== 6) { setOtpError('Please enter the complete 6-digit code.'); return; }
    setIsVerifying(true);
    try {
      await authApi.verifyOtp({ email: email.trim(), otp });
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Invalid verification code.');
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);
    setNeedsVerification(false);
    const success = await login({ email, password, rememberMe });
    if (success) onSuccess?.(email);
  };

  const handleResendOtp = async () => {
    setOtpError(null);
    setOtp('');
    setIsResending(true);
    try {
      await authApi.resendOtp({ email: email.trim() });
      startCountdown();
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsResending(false);
    }
  };

  if (needsVerification) {
    return (
      <div className="auth-form auth-step">
        <div className="auth-icon-badge"><MailIcon size={22} /></div>
        <header className="auth-heading">
          <h2 id="auth-login-title" className="auth-title">Verify your email</h2>
          <p className="auth-subtitle">
            Enter the 6-digit code we sent to <strong>{email}</strong> to finish logging in.
          </p>
        </header>

        <OtpInput value={otp} onChange={(val) => { setOtp(val); setOtpError(null); }} disabled={isVerifying || isLoading} error={otpError || undefined} />

        <button type="button" className="auth-btn auth-btn-primary" onClick={handleVerifyAndLogin} disabled={isVerifying || isLoading || otp.length !== 6} aria-busy={isVerifying || isLoading}>
          {isVerifying || isLoading ? <><LoaderIcon size={18} /> Verifying…</> : 'Verify & login'}
        </button>

        <div className="otp-resend-container">
          {isTimerActive ? (
            <span className="otp-resend-timer"><TimerIcon size={14} /> Resend code in {countdown}s</span>
          ) : (
            <>
              <span>Didn&apos;t get a code?</span>
              <button type="button" className="auth-link-btn" onClick={handleResendOtp} disabled={isResending}>
                {isResending ? 'Resending…' : 'Resend code'}
              </button>
            </>
          )}
        </div>

        <div className="auth-footer">
          <button type="button" className="auth-link-btn auth-link-muted" onClick={() => setNeedsVerification(false)} disabled={isVerifying}>
            <ArrowLeftIcon size={14} /> Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="auth-form auth-step" onSubmit={handleSubmit} noValidate aria-labelledby="auth-login-title">
      <header className="auth-heading">
        <h2 id="auth-login-title" className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Log in to keep drifting into your next favorite.</p>
      </header>

      {storeError && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircleIcon size={18} />
          <span>{storeError}</span>
        </div>
      )}

      <a href={authApi.getGoogleAuthUrl()} className="auth-btn auth-btn-secondary" onClick={(e) => { e.preventDefault(); handleGoogleLogin(); }}>
        <GoogleIcon size={18} />
        Continue with Google
      </a>

      <div className="auth-divider"><span>or use your email</span></div>

      <AuthTextField
        id="login-email"
        name="email"
        type="email"
        label="Email"
        icon={<MailIcon size={18} />}
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); if (storeError) clearError(); }}
        placeholder="you@example.com"
        disabled={isLoading}
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        error={errors.email}
      />

      <PasswordInput id="login-password" name="password" label="Password" value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); if (storeError) clearError(); }} placeholder="Enter your password" error={errors.password} disabled={isLoading} autoComplete="current-password" />

      <div className="auth-options">
        <label className="auth-checkbox">
          <input type="checkbox" className="auth-checkbox-input" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading} />
          <span className="auth-checkbox-box"><CheckIcon size={12} /></span>
          <span>Remember me</span>
        </label>
        <button type="button" className="auth-link-btn" onClick={onForgotPassword} disabled={isLoading}>Forgot password?</button>
      </div>

      <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading} aria-busy={isLoading}>
        {isLoading ? <><LoaderIcon size={18} /> Logging in…</> : 'Log in'}
      </button>
    </form>
  );
};
