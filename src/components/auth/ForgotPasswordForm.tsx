import React, { useCallback, useEffect, useRef, useState } from 'react';
import { OtpInput } from './OtpInput';
import { PasswordInput } from './PasswordInput';
import { AuthTextField } from './AuthTextField';
import { authApi } from '../../services/authApi';
import { ApiError } from '../../services/apiClient';
import { useCountdown } from '../../hooks/useCountdown';
import { MailIcon, CheckCircleIcon, LockIcon, TimerIcon, AlertCircleIcon, LoaderIcon, ArrowLeftIcon } from './AuthIcons';

type ForgotStep = 'email' | 'otp' | 'newPassword';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin, onSuccess }) => {
  const [step, setStep] = useState<ForgotStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { countdown, startCountdown, isActive: isTimerActive } = useCountdown(60);

  const later = useCallback((callback: () => void, ms: number) => {
    timersRef.current.push(setTimeout(callback, ms));
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Email address is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }

    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setStep('otp');
      setSuccessMsg('Password reset code sent successfully.');
      later(() => setSuccessMsg(null), 3000);
      startCountdown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    if (otp.length !== 6) { setOtpError('Please enter the complete 6-digit code.'); return; }

    setIsLoading(true);
    try {
      const res = await authApi.verifyResetOtp({ email: email.trim(), otp });
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
      setStep('newPassword');
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setOtpError(null);
    setOtp('');
    setIsLoading(true);
    try {
      await authApi.resendResetOtp({ email: email.trim() });
      setSuccessMsg('Reset code resent successfully.');
      later(() => setSuccessMsg(null), 3000);
      startCountdown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isComplete) return;
    setError(null);
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), newPassword, resetToken });
      // The reset token is single-use, so the form stays locked until it closes.
      setIsComplete(true);
      setSuccessMsg('Password updated successfully. You can log in now.');
      later(onSuccess, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-icon-badge">
        {step === 'newPassword' ? <LockIcon size={22} /> : <MailIcon size={22} />}
      </div>

      <header className="auth-heading">
        <h2 id="auth-forgot-title" className="auth-title">
          {step === 'email' ? 'Reset your password' : step === 'otp' ? 'Check your email' : 'Choose a new password'}
        </h2>
        <p className="auth-subtitle">
          {step === 'email' && <>Enter your account email and we&apos;ll send you a code to reset it.</>}
          {step === 'otp' && <>Enter the 6-digit code sent to <strong>{email}</strong>.</>}
          {step === 'newPassword' && <>Use at least 6 characters.</>}
        </p>
      </header>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert">
          <AlertCircleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="auth-alert auth-alert-info" role="status">
          <CheckCircleIcon size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {step === 'email' && (
        <form className="auth-form auth-step" onSubmit={handleSendCode} noValidate aria-labelledby="auth-forgot-title">
          <AuthTextField
            id="forgot-email"
            name="email"
            type="email"
            label="Email"
            icon={<MailIcon size={18} />}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com"
            disabled={isLoading}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? <><LoaderIcon size={18} /> Sending code…</> : 'Send reset code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <div className="auth-form auth-step">
          <OtpInput value={otp} onChange={(val) => { setOtp(val); setOtpError(null); }} disabled={isLoading} error={otpError || undefined} />
          <button type="button" className="auth-btn auth-btn-primary" onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6} aria-busy={isLoading}>
            {isLoading ? <><LoaderIcon size={18} /> Verifying…</> : 'Verify code'}
          </button>
          <div className="otp-resend-container">
            {isTimerActive ? (
              <span className="otp-resend-timer"><TimerIcon size={14} /> Resend code in {countdown}s</span>
            ) : (
              <>
                <span>Didn&apos;t get a code?</span>
                <button type="button" className="auth-link-btn" onClick={handleResend} disabled={isLoading}>
                  Resend code
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'newPassword' && (
        <form className="auth-form auth-step" onSubmit={handleResetPassword} noValidate aria-labelledby="auth-forgot-title">
          <PasswordInput id="reset-new-password" name="newPassword" label="New password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(null); }} placeholder="Create a new password" disabled={isLoading} autoComplete="new-password" />
          <PasswordInput id="reset-confirm-password" name="confirmPassword" label="Confirm new password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} placeholder="Re-enter your new password" disabled={isLoading} autoComplete="new-password" />
          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading || isComplete} aria-busy={isLoading}>
            {isLoading ? <><LoaderIcon size={18} /> Resetting…</> : isComplete ? 'Password updated' : 'Reset password'}
          </button>
        </form>
      )}

      <div className="auth-footer">
        <button type="button" className="auth-link-btn auth-link-muted" onClick={() => { setError(null); setSuccessMsg(null); onBackToLogin(); }} disabled={isLoading}>
          <ArrowLeftIcon size={14} /> Back to login
        </button>
      </div>
    </div>
  );
};
