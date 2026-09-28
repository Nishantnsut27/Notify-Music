import React, { useState } from 'react';
import { LockIcon, EyeIcon, EyeOffIcon, AlertCircleIcon } from './AuthIcons';

interface PasswordInputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
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
  label = 'Password',
  placeholder,
  hint,
  error,
  isInvalid,
  disabled = false,
  autoComplete = 'current-password',
  required = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const invalid = !!(isInvalid || error);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <span className="auth-input-icon">
          <LockIcon size={18} />
        </span>

        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          className={`auth-input has-icon has-toggle${invalid ? ' is-invalid' : ''}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />

        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-controls={id}
        >
          {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>

      {error ? (
        <p id={`${id}-error`} className="auth-field-error" role="alert">
          <AlertCircleIcon size={14} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="auth-field-hint">{hint}</p>
      ) : null}
    </div>
  );
};
