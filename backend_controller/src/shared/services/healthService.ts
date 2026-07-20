import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { assertRuntimeConfig } from '#config/env.js';
import { databaseStatus, hasDatabaseConfig } from '#db/client.js';

export async function health(config: AppConfig) {
  const database = await databaseStatus(config);

  return {
    service: 'beonedge-backend-controller',
    status: database.ok ? 'ok' : 'degraded',
    environment: config.nodeEnv,
    providerMode: config.providerMode,
    databaseConfigured: hasDatabaseConfig(config),
    dataStore: config.dataStore,
    database,
    uptimeSeconds: Math.round(process.uptime()),
    warnings: assertRuntimeConfig(config),
  };
}

export function reachability(config: AppConfig) {
  return {
    ok: true,
    minVersion: '1.0.0',
    providerMode: config.providerMode,
    maintenance: false,
  };
}
