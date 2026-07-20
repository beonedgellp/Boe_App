import { createServer, type Server } from 'node:http';
import { loadConfig, assertProductionConfig, assertRuntimeConfig } from './config/env.js';
import { createRouter } from './router.js';
import { createLogger } from './shared/logger.js';
import type { AppConfig, Logger, LogLevel } from '#types/index.js';

interface CreateServerOptions {
  config?: AppConfig;
  logger?: Logger;
}

export function createBackendServer({
  config = loadConfig(),
  logger = createLogger({ level: (process.env.LOG_LEVEL as LogLevel) || 'info' }),
}: CreateServerOptions = {}): Server {
  const router = createRouter({ config, logger });
  return createServer((req, res) => router.handle(req, res));
}

interface ListenErrorOptions {
  error: NodeJS.ErrnoException;
  config: AppConfig;
  logger: Logger;
  exit?: (code?: number) => never;
}

export function handleListenError({ error, config, logger, exit = process.exit }: ListenErrorOptions): void {
  if (error?.code !== 'EADDRINUSE') {
    throw error;
  }

  logger.error(`Port already in use: http://${config.host}:${config.port}`);
  logger.error('Stop the existing backend process or set PORT to a different value.');
  logger.error(`Find the process with: lsof -nP -iTCP:${config.port} -sTCP:LISTEN`);
  exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const warnings = assertRuntimeConfig(config);
  const errors = assertProductionConfig(config);
  const logger = createLogger({ level: (process.env.LOG_LEVEL as LogLevel) || 'info' });

  if (errors.length > 0) {
    for (const error of errors) logger.error(`config error: ${error}`);
    process.exit(1);
  }

  const server = createBackendServer({ config, logger });
  server.on('error', (error) => handleListenError({ error, config, logger }));

  server.listen(config.port, config.host, () => {
    logger.info(`BeOnEdge backend listening on http://${config.host}:${config.port}`);
    for (const warning of warnings) logger.warn(`config: ${warning}`);
  });
}
