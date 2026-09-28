import React from 'react';
import { AlertCircleIcon } from './AuthIcons';

interface AuthTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'id'> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
}

export const AuthTextField: React.FC<AuthTextFieldProps> = ({ id, label, icon, error, hint, ...inputProps }) => {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        {icon && <span className="auth-input-icon">{icon}</span>}
        <input
          id={id}
          className={`auth-input${icon ? ' has-icon' : ''}${error ? ' is-invalid' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
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
