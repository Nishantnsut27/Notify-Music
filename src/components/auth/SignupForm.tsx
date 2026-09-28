import React, { useState } from 'react';
import { PasswordInput } from './PasswordInput';
import { OtpInput } from './OtpInput';
import { AuthTextField } from './AuthTextField';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/authApi';
import { ApiError } from '../../services/apiClient';
import { useCountdown } from '../../hooks/useCountdown';
import { UserIcon, MailIcon, CheckCircleIcon, AlertCircleIcon, TimerIcon, LoaderIcon, CheckIcon, GoogleIcon } from './AuthIcons';

const SIGNUP_STEPS = ['Details', 'Verify email', 'Create account'];

const SignupSteps: React.FC<{ current: number }> = ({ current }) => (
  <ol className="auth-steps" aria-label={`Sign-up progress: step ${current} of ${SIGNUP_STEPS.length}`}>
    {SIGNUP_STEPS.map((label, i) => {
      const step = i + 1;
      const state = step < current ? ' is-complete' : step === current ? ' is-current' : '';
      return (
        <li key={label} className={`auth-steps-item${state}`} aria-current={step === current ? 'step' : undefined}>
          <span className="auth-steps-bar" />
          <span className="auth-steps-label">{label}</span>
        </li>
      );
    })}
  </ol>
);

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: (userEmail: string) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; terms?: string; }>({});
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const { signup, error: storeError, clearError } = useAuthStore();
  const { countdown, startCountdown, isActive: isTimerActive } = useCountdown(60);

  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', className: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const classes = ['', 'strength-weak', 'strength-fair', 'strength-good', 'strength-strong'];
    return { score, label: labels[score], className: classes[score] };
  };
  const strengthInfo = calculatePasswordStrength(password);

  const validateStep1 = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email address is required';
    else if (!emailRegex.test(email.trim())) newErrors.email = 'Please enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!agreeTerms) newErrors.terms = 'You must accept the Terms of Service';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSendError(null);
    if (!validateStep1()) return;
    setIsSendingOtp(true);
    try {
      await authApi.sendOtp({ fullName: fullName.trim(), email: email.trim(), password });
      setShowOtpStep(true);
      startCountdown();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError(null);
    setOtp('');
    setIsSendingOtp(true);
    try {
      await authApi.resendOtp({ email: email.trim() });
      startCountdown();
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    if (otp.length !== 6) { setOtpError('Please enter the complete 6-digit code.'); return; }
    setIsVerifyingOtp(true);
    try {
      await authApi.verifyOtp({ email: email.trim(), otp });
      setIsEmailVerified(true);
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'Invalid verification code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleCreateAccount = async () => {
    clearError();
    setIsSendingOtp(true);
    try {
      const success = await signup({ fullName: fullName.trim(), email: email.trim(), password });
      if (success && onSuccess) onSuccess(email);
    } finally {
      setIsSendingOtp(false);
    }
  };

  if (isEmailVerified) {
    return (
      <div className="auth-form auth-step">
        <SignupSteps current={3} />
        <div className="auth-icon-badge"><CheckCircleIcon size={22} /></div>
        <header className="auth-heading">
          <h2 id="auth-signup-title" className="auth-title">Email verified</h2>
          <p className="auth-subtitle">
            <strong>{email}</strong> is confirmed. Create your account to start listening.
          </p>
        </header>

        {storeError && (<div className="auth-alert auth-alert-error" role="alert"><AlertCircleIcon size={18} /><span>{storeError}</span></div>)}

        <button type="button" className="auth-btn auth-btn-primary" onClick={handleCreateAccount} disabled={isSendingOtp} aria-busy={isSendingOtp}>
          {isSendingOtp ? <><LoaderIcon size={18} /> Creating account…</> : 'Create account'}
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSendVerificationCode} noValidate aria-labelledby="auth-signup-title">
      <SignupSteps current={showOtpStep ? 2 : 1} />

      {!showOtpStep ? (
        <div className="auth-form auth-step">
          <header className="auth-heading">
            <h2 id="auth-signup-title" className="auth-title">Create your account</h2>
            <p className="auth-subtitle">Save songs, build playlists, sync everywhere.</p>
          </header>

          {(sendError || storeError) && (
            <div className="auth-alert auth-alert-error" role="alert"><AlertCircleIcon size={18} /><span>{sendError || storeError}</span></div>
          )}

          <a href={authApi.getGoogleAuthUrl()} className="auth-btn auth-btn-secondary" onClick={(e) => { e.preventDefault(); window.location.href = authApi.getGoogleAuthUrl(); }}>
            <GoogleIcon size={18} />
            Sign up with Google
          </a>

          <div className="auth-divider"><span>or use your email</span></div>

          <AuthTextField
            id="signup-name"
            name="fullName"
            type="text"
            label="Full name"
            icon={<UserIcon size={18} />}
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined })); }}
            placeholder="Your name"
            disabled={isSendingOtp}
            autoComplete="name"
            error={errors.fullName}
          />

          <AuthTextField
            id="signup-email"
            name="email"
            type="email"
            label="Email"
            icon={<MailIcon size={18} />}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
            placeholder="you@example.com"
            disabled={isSendingOtp}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.email}
          />

          <div className="auth-field-group">
            <PasswordInput id="signup-password" name="password" label="Password" value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }} placeholder="Create a password" hint={password ? undefined : 'Use at least 6 characters.'} error={errors.password} disabled={isSendingOtp} autoComplete="new-password" />

            {password.length > 0 && (
              <div className="password-strength-container">
                <div className="password-strength-bars" aria-hidden="true">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`password-strength-bar ${strengthInfo.score >= step ? strengthInfo.className : ''}`} />
                  ))}
                </div>
                <div className="password-strength-label" aria-live="polite">
                  <span>Strength:</span>
                  <span className={`strength-text ${strengthInfo.className}`}>{strengthInfo.label}</span>
                </div>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-checkbox auth-checkbox-multiline">
              <input type="checkbox" className="auth-checkbox-input" checked={agreeTerms} onChange={(e) => { setAgreeTerms(e.target.checked); if (errors.terms) setErrors((p) => ({ ...p, terms: undefined })); }} disabled={isSendingOtp} aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? 'signup-terms-error' : undefined} />
              <span className="auth-checkbox-box"><CheckIcon size={12} /></span>
              <span>
                I agree to the <a href="/terms" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = '/terms'; }} className="auth-legal-link">Terms</a> &amp; <a href="/privacy" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = '/privacy'; }} className="auth-legal-link">Privacy Policy</a>
              </span>
            </label>
            {errors.terms && (
              <p id="signup-terms-error" className="auth-field-error" role="alert">
                <AlertCircleIcon size={14} />
                <span>{errors.terms}</span>
              </p>
            )}
          </div>

          <button type="submit" className="auth-btn auth-btn-primary" disabled={isSendingOtp} aria-busy={isSendingOtp}>
            {isSendingOtp ? <><LoaderIcon size={18} /> Sending code…</> : 'Send verification code'}
          </button>
        </div>
      ) : (
        <div className="auth-form auth-step">
          <div className="auth-icon-badge"><MailIcon size={22} /></div>
          <header className="auth-heading">
            <h2 id="auth-signup-title" className="auth-title">Check your email</h2>
            <p className="auth-subtitle">
              Enter the 6-digit code sent to <strong>{email}</strong>.
            </p>
          </header>

          <OtpInput value={otp} onChange={(val) => { setOtp(val); setOtpError(null); }} disabled={isVerifyingOtp} error={otpError || undefined} />

          <button type="button" className="auth-btn auth-btn-primary" onClick={handleVerifyOtp} disabled={isVerifyingOtp || otp.length !== 6} aria-busy={isVerifyingOtp}>
            {isVerifyingOtp ? <><LoaderIcon size={18} /> Verifying…</> : 'Verify code'}
          </button>

          <div className="otp-resend-container">
            {isTimerActive ? (
              <span className="otp-resend-timer"><TimerIcon size={14} /> Resend code in {countdown}s</span>
            ) : (
              <>
                <span>Didn&apos;t get a code?</span>
                <button type="button" className="auth-link-btn" onClick={handleResendOtp} disabled={isSendingOtp}>
                  {isSendingOtp ? 'Resending…' : 'Resend code'}
                </button>
              </>
            )}
          </div>

          <p className="auth-footer">
            Wrong email?
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => { setShowOtpStep(false); setOtp(''); setOtpError(null); setSendError(null); }}
              disabled={isVerifyingOtp}
            >
              Change email
            </button>
          </p>
        </div>
      )}
    </form>
  );
};
