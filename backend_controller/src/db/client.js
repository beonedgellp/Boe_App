import pg from 'pg';

const { Pool } = pg;

let pool = null;
let poolKey = '';

function poolConfig(config) {
  const common = {
    max: config.dbPoolMax,
    idleTimeoutMillis: config.dbIdleTimeoutMs,
    connectionTimeoutMillis: config.dbConnectionTimeoutMs,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  };

  if (config.databaseUrl) {
    return {
      ...common,
      connectionString: config.databaseUrl,
    };
  }

  return {
    ...common,
    host: config.databaseHost,
    port: config.databasePort,
    database: config.databaseName,
    user: config.databaseUser,
    password: config.databasePassword,
  };
}

export function hasDatabaseConfig(config) {
  return Boolean(config.databaseUrl || (config.databaseHost && config.databaseName && config.databaseUser));
}

export function redactDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return '';

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = parsed.username || '***';
    return parsed.toString();
  } catch {
    return '[invalid database url]';
  }
}

export function getPool(config) {
  if (!hasDatabaseConfig(config)) {
    throw new Error('Database connection is not configured.');
  }

  const key = JSON.stringify({
    databaseUrl: config.databaseUrl,
    databaseHost: config.databaseHost,
    databasePort: config.databasePort,
    databaseName: config.databaseName,
    databaseUser: config.databaseUser,
    databasePassword: config.databasePassword,
    dbPoolMax: config.dbPoolMax,
    dbIdleTimeoutMs: config.dbIdleTimeoutMs,
    dbConnectionTimeoutMs: config.dbConnectionTimeoutMs,
    databaseSsl: config.databaseSsl,
  });

  if (!pool || poolKey !== key) {
    if (pool) void pool.end();
    pool = new Pool(poolConfig(config));
    poolKey = key;
  }

  return pool;
}

export async function query(config, text, params = []) {
  return getPool(config).query(text, params);
}

export async function transaction(config, callback) {
  const client = await getPool(config).connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = null;
  poolKey = '';
}

export async function databaseStatus(config) {
  if (!hasDatabaseConfig(config)) {
    return {
      configured: false,
      ok: false,
      message: 'Database connection is not configured.',
    };
  }

  const startedAt = Date.now();

  try {
    const result = await query(
      config,
      'select current_database() as database, current_user as user, inet_server_addr() as host, inet_server_port() as port',
    );
    const row = result.rows[0];

    return {
      configured: true,
      ok: true,
      database: row.database,
      user: row.user,
      host: row.host,
      port: row.port,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      url: redactDatabaseUrl(config.databaseUrl),
      host: config.databaseHost || undefined,
      port: config.databaseHost ? config.databasePort : undefined,
      database: config.databaseName || undefined,
      user: config.databaseUser || undefined,
      message: error.message,
      latencyMs: Date.now() - startedAt,
    };
  }
}
