import React, { useRef, useEffect, useCallback } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const char = e.target.value.replace(/\D/g, '').slice(-1);
      if (!char) return;

      const newValue = value.split('');
      newValue[index] = char;
      const joined = newValue.join('');
      onChange(joined);

      if (index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [value, length, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const newValue = value.split('');
        if (newValue[index]) {
          newValue[index] = '';
          onChange(newValue.join(''));
        } else if (index > 0) {
          newValue[index - 1] = '';
          onChange(newValue.join(''));
          inputsRef.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [value, length, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!pasted) return;

      onChange(pasted);
      const focusIndex = Math.min(pasted.length, length - 1);
      inputsRef.current[focusIndex]?.focus();
    },
    [length, onChange]
  );

  const handleFocus = useCallback((index: number) => {
    inputsRef.current[index]?.select();
  }, []);

  return (
    <div className="otp-input-wrapper">
      <div className="otp-input-container">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            onFocus={() => handleFocus(i)}
            disabled={disabled}
            className={`otp-input-box${error ? ' is-invalid' : ''}`}
            aria-label={`Digit ${i + 1}`}
            autoComplete="one-time-code"
          />
        ))}
      </div>
      {error && (
        <span className="auth-field-error otp-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
