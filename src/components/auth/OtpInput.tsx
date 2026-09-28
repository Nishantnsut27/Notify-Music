import React, { useRef, useEffect, useCallback, useId, useState } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

const toDigits = (value: string, length: number): string[] =>
  Array.from({ length }, (_, i) => (/\d/.test(value[i] ?? '') ? value[i] : ''));

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const errorId = useId();
  // Boxes keep their positions (a cleared middle box stays empty) while the parent
  // receives only the typed digits, so its `length === 6` completeness check still holds.
  const [digits, setDigits] = useState<string[]>(() => toDigits(value, length));
  const lastEmitted = useRef(value);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setDigits(toDigits(value, length));
  }, [value, length]);

  const commit = useCallback(
    (next: string[]) => {
      setDigits(next);
      const joined = next.join('');
      lastEmitted.current = joined;
      onChange(joined);
    },
    [onChange]
  );

  /** Spreads several digits (paste or one-time-code autofill) across the boxes. */
  const fillFrom = useCallback(
    (start: number, incoming: string) => {
      const from = incoming.length >= length ? 0 : start;
      const next = [...digits];
      incoming.slice(0, length - from).split('').forEach((digit, offset) => {
        next[from + offset] = digit;
      });
      commit(next);
      const firstEmpty = next.findIndex((digit) => !digit);
      inputsRef.current[firstEmpty === -1 ? length - 1 : firstEmpty]?.focus();
    },
    [digits, length, commit]
  );

  const handleChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (!raw) return;

      const previous = digits[index];
      if (raw.length === 1 || (raw.length === 2 && previous)) {
        // A box that already held a digit reports both characters when the selection didn't take.
        const char = raw.length === 1 ? raw : raw[0] === previous ? raw[1] : raw[0];
        const next = [...digits];
        next[index] = char;
        commit(next);
        if (index < length - 1) inputsRef.current[index + 1]?.focus();
        return;
      }

      fillFrom(index, raw);
    },
    [digits, length, commit, fillFrom]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        const next = [...digits];
        if (next[index]) {
          next[index] = '';
          commit(next);
        } else if (index > 0) {
          next[index - 1] = '';
          commit(next);
          inputsRef.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [digits, length, commit]
  );

  const handlePaste = useCallback(
    (index: number, e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
      if (pasted) fillFrom(index, pasted);
    },
    [fillFrom]
  );

  const handleFocus = useCallback((index: number) => {
    inputsRef.current[index]?.select();
  }, []);

  return (
    <div className="otp-input-wrapper">
      <div className="otp-input-container" role="group" aria-label="Verification code">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={digits[i]}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={() => handleFocus(i)}
            disabled={disabled}
            className={`otp-input-box${digits[i] ? ' is-filled' : ''}${error ? ' is-invalid' : ''}`}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            autoComplete="one-time-code"
          />
        ))}
      </div>
      {error && (
        <p id={errorId} className="auth-field-error otp-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
