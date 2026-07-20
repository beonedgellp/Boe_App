import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import { handleListenError } from './server.js';

function createLogger() {
  const errors: any[] = [];
  return {
    errors,
    error(message: any) {
      errors.push(message);
    },
  };
}

describe('handleListenError', () => {
  test('logs a clear message and exits when the configured port is already in use', () => {
    const logger = createLogger();
    const exits: any[] = [];

    handleListenError({
      error: { code: 'EADDRINUSE' },
      config: { host: '127.0.0.1', port: 47502 },
      logger,
      exit(code: any) {
        exits.push(code);
      },
    } as any);

    assert.deepEqual(exits, [1]);
    assert.deepEqual(logger.errors, [
      'Port already in use: http://127.0.0.1:47502',
      'Stop the existing backend process or set PORT to a different value.',
      'Find the process with: lsof -nP -iTCP:47502 -sTCP:LISTEN',
    ]);
  });

  test('rethrows unexpected listen errors', () => {
    assert.throws(
      () => handleListenError({
        error: new Error('permission denied'),
        config: { host: '127.0.0.1', port: 47502 },
        logger: createLogger(),
      } as any),
      /permission denied/,
    );
  });
});
