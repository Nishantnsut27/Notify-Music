import React, { useState } from 'react';
import { OtpInput } from './OtpInput';
import { PasswordInput } from './PasswordInput';
import { authApi } from '../../services/authApi';
import { ApiError } from '../../services/apiClient';
import { useCountdown } from '../../hooks/useCountdown';
import { MailIcon, SendIcon, CheckCircleIcon, LockIcon, TimerIcon, AlertCircleIcon, LoaderIcon, ArrowLeftIcon } from './AuthIcons';

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

  const { countdown, startCountdown, isActive: isTimerActive } = useCountdown(60);

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
      setTimeout(() => setSuccessMsg(null), 3000);
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
      setTimeout(() => setSuccessMsg(null), 3000);
      startCountdown();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ email: email.trim(), newPassword, resetToken });
      setSuccessMsg('Password updated successfully.');
      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-glass-form forgot-password-form">
      <div className="auth-silhouette-avatar">
        {step === 'newPassword' ? <LockIcon size={54} /> : <MailIcon size={54} />}
      </div>

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
        <form onSubmit={handleSendCode} noValidate>
          <p className="forgot-password-instruction">
            Enter your email address and we'll send you a code to reset your password.
          </p>
          <div className="auth-glass-field">
            <div className="auth-input-wrapper">
              <span className="auth-input-icon-left"><MailIcon size={18} /></span>
              <input id="forgot-email" name="email" type="email" className="auth-glass-input" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="Email ID" disabled={isLoading} autoComplete="email" />
            </div>
          </div>
          <button type="submit" className="auth-glass-btn" disabled={isLoading}>
            {isLoading ? <><LoaderIcon size={18} /> SENDING CODE...</> : 'SEND RESET CODE'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <div className="otp-step-container">
          <p className="forgot-password-instruction">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>
          <OtpInput value={otp} onChange={(val) => { setOtp(val); setOtpError(null); }} disabled={isLoading} error={otpError || undefined} />
          <button type="button" className="auth-glass-btn" onClick={handleVerifyOtp} disabled={isLoading || otp.length !== 6}>
            {isLoading ? <><LoaderIcon size={18} /> VERIFYING...</> : 'VERIFY CODE'}
          </button>
          <div className="otp-resend-container">
            {isTimerActive ? (
              <span className="otp-resend-timer"><TimerIcon size={14} /> Resend code in {countdown}s</span>
            ) : (
              <button type="button" className="otp-resend-btn" onClick={handleResend} disabled={isLoading}>
                <SendIcon size={14} /> Resend Code
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'newPassword' && (
        <form onSubmit={handleResetPassword} noValidate>
          <p className="forgot-password-instruction">Enter your new password.</p>
          <PasswordInput id="reset-new-password" name="newPassword" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError(null); }} placeholder="New Password" disabled={isLoading} autoComplete="new-password" />
          <PasswordInput id="reset-confirm-password" name="confirmPassword" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }} placeholder="Confirm Password" disabled={isLoading} autoComplete="new-password" />
          <button type="submit" className="auth-glass-btn" disabled={isLoading}>
            {isLoading ? <><LoaderIcon size={18} /> RESETTING...</> : 'RESET PASSWORD'}
          </button>
        </form>
      )}

      <div className="auth-flip-trigger-footer">
        <button type="button" className="auth-flip-trigger-btn" onClick={() => { setError(null); setSuccessMsg(null); onBackToLogin(); }} disabled={isLoading}>
          <ArrowLeftIcon size={14} /> Back to Login
        </button>
      </div>
    </div>
  );
};
