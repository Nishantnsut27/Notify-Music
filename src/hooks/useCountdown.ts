import { useState, useRef, useCallback, useEffect } from 'react';

export function useCountdown(initialSeconds: number) {
  const [countdown, setCountdown] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    clearTimer();
    setCountdown(initialSeconds);
    setIsActive(true);
  }, [initialSeconds, clearTimer]);

  useEffect(() => {
    if (!isActive || countdown <= 0) {
      if (countdown <= 0 && isActive) {
        setIsActive(false);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isActive, countdown, clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { countdown, startCountdown, isActive };
}
