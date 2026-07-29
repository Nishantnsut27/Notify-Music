import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon } from './AuthIcons';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  isInvalid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  required?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = 'Password',
  error,
  isInvalid,
  disabled = false,
  autoComplete = 'current-password',
  required = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-glass-field">
      <div className="auth-input-wrapper">
        <span className="auth-input-icon-left">
          <LockIcon size={18} />
        </span>

        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          className={`auth-glass-input ${isInvalid || error ? 'is-invalid' : ''}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={!!(isInvalid || error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />

        <button
          type="button"
          className="auth-input-toggle-right"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>

      {error && (
        <span id={`${id}-error`} className="auth-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
