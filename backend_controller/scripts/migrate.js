import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { loadConfig } from '#config/env.js';

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function migrationFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
}

function hasDatabaseConfig(config) {
  return Boolean(config.databaseUrl || (config.databaseHost && config.databaseName && config.databaseUser));
}

function psqlConnection(config) {
  if (config.databaseUrl) {
    return {
      args: [config.databaseUrl],
      env: process.env,
    };
  }

  return {
    args: [],
    env: {
      ...process.env,
      PGHOST: config.databaseHost,
      PGPORT: String(config.databasePort),
      PGDATABASE: config.databaseName,
      PGUSER: config.databaseUser,
      PGPASSWORD: config.databasePassword,
    },
  };
}

function runPsql(config, sql) {
  return new Promise((resolvePromise, rejectPromise) => {
    const connection = psqlConnection(config);
    const child = spawn('psql', [
      ...connection.args,
      '--set=ON_ERROR_STOP=1',
      '--quiet',
      '--tuples-only',
      '--no-align',
    ], {
      env: connection.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else rejectPromise(new Error(stderr.trim() || `psql exited with code ${code}`));
    });

    child.stdin.end(sql);
  });
}

async function appliedVersions(config) {
  const sql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  filename text NOT NULL,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SELECT version FROM schema_migrations ORDER BY version;
`;
  const output = await runPsql(config, sql);
  return new Set(output.split('\n').map((line) => line.trim()).filter(Boolean));
}

async function status(config, files) {
  if (!hasDatabaseConfig(config)) {
    for (const file of files) console.log(`pending ${file}`);
    console.log('Database connection is not configured; status is local-only.');
    return;
  }

  const applied = await appliedVersions(config);
  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    console.log(`${applied.has(version) ? 'applied' : 'pending'} ${file}`);
  }
}

async function up(config, dir, files) {
  if (!hasDatabaseConfig(config)) {
    throw new Error('Database connection is required to run migrations.');
  }

  const applied = await appliedVersions(config);

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) {
      console.log(`skip ${file}`);
      continue;
    }

    const path = resolve(dir, file);
    const body = await readFile(path, 'utf8');
    const checksum = createHash('sha256').update(body).digest('hex');
    const sql = `
BEGIN;
${body}
INSERT INTO schema_migrations (version, filename, checksum)
VALUES (${sqlLiteral(version)}, ${sqlLiteral(file)}, ${sqlLiteral(checksum)});
COMMIT;
`;

    await runPsql(config, sql);
    console.log(`applied ${file}`);
  }
}

const command = process.argv[2] || 'up';
const config = loadConfig();
const dir = resolve(process.cwd(), config.migrationsDir);
const files = await migrationFiles(dir).catch((error) => {
  if (error.code === 'ENOENT') return [];
  throw error;
});

if (command === 'status') await status(config, files);
else if (command === 'up') await up(config, dir, files);
else {
  console.error('Usage: node scripts/migrate.js [status|up]');
  process.exitCode = 1;
}
