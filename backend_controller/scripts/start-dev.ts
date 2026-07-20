#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createBackendServer } from '../src/server.js';
import { loadConfig } from '#config/env.js';
import { createConnection } from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WITH_FRONTEND = process.argv.includes('--with-frontend');
const FRONTEND_DIR = path.resolve(__dirname, '..', '..', 'frontend_stack', 'app');

let backendServer = null;
let frontendProc = null;
let shuttingDown = false;

function log(msg) {
  console.log(`[start-dev] ${msg}`);
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`Received ${signal}. Shutting down gracefully...`);

  const timers = [];

  if (frontendProc && !frontendProc.killed) {
    frontendProc.kill('SIGTERM');
    timers.push(
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          if (frontendProc && !frontendProc.killed) frontendProc.kill('SIGKILL');
          resolve();
        }, 5000);
        frontendProc.once('exit', () => {
          clearTimeout(t);
          resolve();
        });
      })
    );
  }

  if (backendServer) {
    timers.push(
      new Promise<void>((resolve) => {
        backendServer.close(() => resolve());
        setTimeout(resolve, 5000);
      })
    );
  }

  Promise.all(timers).then(() => {
    log('Cleanup complete. Exiting.');
    process.exit(0);
  });
}

async function startFrontend() {
  log('Starting frontend dev server...');
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  proc.on('error', (err) => {
    log(`Frontend failed to start: ${err.message}`);
  });

  proc.on('exit', (code) => {
    if (!shuttingDown) {
      log(`Frontend dev server exited with code ${code}.`);
    }
  });

  return proc;
}

function isPortInUse(port, host) {
  return new Promise<boolean>((resolve) => {
    const conn = createConnection(port, host);
    conn.once('connect', () => { conn.destroy(); resolve(true); });
    conn.once('error', () => resolve(false));
  });
}

async function main() {
  const config = loadConfig();

  if (await isPortInUse(config.port, config.host)) {
    log(`Port ${config.port} is already in use.`);
    log('Run:  lsof -tiTCP:' + config.port + ' -sTCP:LISTEN | xargs -r kill');
    log('Or:   fuser -k ' + config.port + '/tcp');
    process.exit(1);
  }

  backendServer = createBackendServer({ config });

  await new Promise<void>((resolve, reject) => {
    backendServer.listen(config.port, config.host, () => {
      log(`Backend running at http://${config.host}:${config.port}`);
      resolve();
    });
    backendServer.on('error', reject);
  });

  if (WITH_FRONTEND) {
    frontendProc = await startFrontend();
  } else {
    log('Frontend dev server not started. Run with --with-frontend to start it,');
    log(`or manually run: cd frontend_stack/app && npm run dev`);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
