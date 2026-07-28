type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, scope: string, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {})
  };

  const payload = JSON.stringify(entry);

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export const logger = {
  info(scope: string, message: string, meta?: Record<string, unknown>): void {
    log('info', scope, message, meta);
  },
  warn(scope: string, message: string, meta?: Record<string, unknown>): void {
    log('warn', scope, message, meta);
  },
  error(scope: string, message: string, meta?: Record<string, unknown>): void {
    log('error', scope, message, meta);
  },
  debug(scope: string, message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'production') return;
    log('debug', scope, message, meta);
  }
};

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return { error };
}