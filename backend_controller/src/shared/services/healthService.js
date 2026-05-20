import { assertRuntimeConfig } from '../../config/env.js';
import { databaseStatus, hasDatabaseConfig } from '../../db/client.js';
import { jsonDatabaseStatus, jsonStoreEnabled } from '../../db/jsonStore.js';

export async function health(config) {
  const database = jsonStoreEnabled(config)
    ? await jsonDatabaseStatus(config)
    : await databaseStatus(config);

  return {
    service: 'beonedge-backend-controller',
    status: database.ok ? 'ok' : 'degraded',
    environment: config.nodeEnv,
    providerMode: config.providerMode,
    databaseConfigured: jsonStoreEnabled(config) || hasDatabaseConfig(config),
    dataStore: config.dataStore,
    database,
    uptimeSeconds: Math.round(process.uptime()),
    warnings: assertRuntimeConfig(config),
  };
}

export function reachability(config) {
  return {
    ok: true,
    minVersion: '1.0.0',
    providerMode: config.providerMode,
    maintenance: false,
  };
}
