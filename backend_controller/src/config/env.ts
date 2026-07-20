import { loadEnvFile } from './dotenv.js';

loadEnvFile();

const DEFAULT_PORT = 47500;
const PROVIDER_MODES = new Set(['development', 'staging', 'live', 'razorpay', 'mock']);

function readBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function readPort(value) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function unsafeSecret(value) {
  const text = String(value || '');
  return (
    text.length < 32 ||
    text.includes('replace-with') ||
    text.includes('change-before') ||
    text.startsWith('dev-') ||
    text.startsWith('local-')
  );
}

export function loadConfig(env = process.env) {
  const providerMode = PROVIDER_MODES.has(env.PROVIDER_MODE) ? env.PROVIDER_MODE : 'development';

  // dbDriver selects the store implementation. Postgres is the only supported driver.
  const rawDbDriver = (env.DB_DRIVER || '').toLowerCase();
  let dbDriver = 'pg';
  if (rawDbDriver === 'pg' || rawDbDriver === 'postgres' || rawDbDriver === 'postgresql') {
    dbDriver = 'pg';
  }

  return {
    nodeEnv: env.NODE_ENV || 'development',
    host: env.HOST || '127.0.0.1',
    port: readPort(env.PORT),
    logLevel: env.LOG_LEVEL || 'info',
    databaseUrl: env.DATABASE_URL || '',
    databaseHost: env.DATABASE_HOST || env.PGHOST || '',
    databasePort: readPositiveInt(env.DATABASE_PORT || env.PGPORT, 5432),
    databaseName: env.DATABASE_NAME || env.PGDATABASE || '',
    databaseUser: env.DATABASE_USER || env.PGUSER || '',
    databasePassword: env.DATABASE_PASSWORD || env.PGPASSWORD || '',
    databaseSsl: readBoolean(env.DATABASE_SSL, false),
    pgSsl: readBoolean(env.PGSSL, false),
    dbDriver,
    dataStore: 'postgres',
    dbPoolMax: readPositiveInt(env.DB_POOL_MAX, 10),
    dbConnectionTimeoutMs: readPositiveInt(env.DB_CONNECTION_TIMEOUT_MS, 3000),
    dbIdleTimeoutMs: readPositiveInt(env.DB_IDLE_TIMEOUT_MS, 10000),
    migrationsDir: env.MIGRATIONS_DIR || './db/migrations',
    providerMode,
    corsOrigins: readCsv(env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173'),
    accessTokenSecret: env.ACCESS_TOKEN_SECRET || '',
    refreshTokenSecret: env.REFRESH_TOKEN_SECRET || '',
    allowDevAuth: readBoolean(env.ALLOW_DEV_AUTH, false),
    adminLoginId: env.ADMIN_LOGIN_ID || env.SEED_ADMIN_EMAIL || '',
    adminPassword: env.ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD || '',
    adminFirstName: env.ADMIN_FIRST_NAME || env.SEED_ADMIN_FIRST_NAME || 'BeOnEdge',
    adminLastName: env.ADMIN_LAST_NAME || env.SEED_ADMIN_LAST_NAME || 'Admin',
    adminPhone: env.ADMIN_PHONE || env.SEED_ADMIN_PHONE || '',
    adminUserId: env.ADMIN_USER_ID || '00000000-0000-4000-8000-000000000001',
    signupAllowedOrigin: env.SIGNUP_ALLOWED_ORIGIN || '',
    signupProxySecret: env.SIGNUP_PROXY_SECRET || '',
    mockWebhookEnabled: readBoolean(env.MOCK_WEBHOOK_ENABLED, false),
    razorpayKeyId: env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
  };
}

export function assertRuntimeConfig(config) {
  const warnings = [];
  const hasDiscreteDatabaseConfig = Boolean(config.databaseHost && config.databaseName && config.databaseUser);

  if (!config.databaseUrl && !hasDiscreteDatabaseConfig) {
    warnings.push('Database connection is not configured; database-backed routes will remain unavailable.');
  }

  if (unsafeSecret(config.accessTokenSecret)) {
    warnings.push('ACCESS_TOKEN_SECRET is not configured for shared environments.');
  }
  if (unsafeSecret(config.refreshTokenSecret)) {
    warnings.push('REFRESH_TOKEN_SECRET is not configured for shared environments.');
  }
  if (config.allowDevAuth) {
    warnings.push('ALLOW_DEV_AUTH is enabled; disable it outside isolated local development.');
  }

  return warnings;
}

export function assertProductionConfig(config) {
  const errors = [];
  const isSharedRuntime = config.nodeEnv === 'production' || config.providerMode === 'live';

  if (!isSharedRuntime) return errors;

  if (unsafeSecret(config.accessTokenSecret)) {
    errors.push('ACCESS_TOKEN_SECRET must be a strong non-default value in production/live mode.');
  }
  if (unsafeSecret(config.refreshTokenSecret)) {
    errors.push('REFRESH_TOKEN_SECRET must be a strong non-default value in production/live mode.');
  }
  if (config.allowDevAuth) {
    errors.push('ALLOW_DEV_AUTH must be false in production/live mode.');
  }
  const hasDiscrete = Boolean(config.databaseHost && config.databaseName && config.databaseUser);
  if (!config.databaseUrl && !hasDiscrete) {
    errors.push('DATABASE_URL (or DATABASE_HOST/NAME/USER) must be set.');
  }
  if (config.adminUserId === '00000000-0000-4000-8000-000000000001') {
    errors.push('ADMIN_USER_ID must be set to a non-default value in production/live mode.');
  }
  if (!config.adminPassword || config.adminPassword.length < 12) {
    errors.push('ADMIN_PASSWORD must be at least 12 characters in production/live mode.');
  }
  if (!config.signupProxySecret && !config.signupAllowedOrigin) {
    errors.push('SIGNUP_PROXY_SECRET or SIGNUP_ALLOWED_ORIGIN must be set in production/live mode.');
  }
  // Capacitor APKs present these WebView origins even in production
  // (androidScheme=https); they cannot be claimed by a plain-http dev server.
  const capacitorAppOrigins = new Set(['https://localhost', 'capacitor://localhost']);
  const hasLocalhostCors = config.corsOrigins.some(
    (o) => !capacitorAppOrigins.has(o) && (o.includes('localhost') || o.includes('127.0.0.1')),
  );
  if (hasLocalhostCors) {
    errors.push('CORS_ORIGIN must not contain localhost or 127.0.0.1 in production/live mode (the Capacitor app origins https://localhost and capacitor://localhost are exempt).');
  }
  if (config.corsOrigins.length === 0 || config.corsOrigins.includes('*')) {
    errors.push('CORS_ORIGIN must be an explicit non-wildcard list in production/live mode.');
  }
  if (config.mockWebhookEnabled) {
    errors.push('MOCK_WEBHOOK_ENABLED must be false in production/live mode.');
  }

  return errors;
}
