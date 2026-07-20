import type { Logger, LogLevel, LogMeta } from '#types/index.js';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger({ level = 'info' }: { level?: LogLevel } = {}): Logger {
  const minLevel = LEVELS[level] ?? 1;

  function log(severity: LogLevel, message: string, meta: LogMeta = {}): void {
    if ((LEVELS[severity] ?? 1) < minLevel) return;
    const entry = {
      level: severity,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
}
