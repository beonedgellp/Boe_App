import { loadConfig } from '#config/env.js';
import { closePool, databaseStatus, hasDatabaseConfig } from '#db/client.js';

const config = loadConfig();

if (!hasDatabaseConfig(config)) {
  console.error('DATABASE_URL (or DATABASE_HOST/NAME/USER) is not configured.');
  process.exit(1);
}

const status = await databaseStatus(config);

console.log(JSON.stringify(status, null, 2));

await closePool().catch(() => {});
process.exitCode = status.ok ? 0 : 1;
