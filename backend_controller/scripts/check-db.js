import { loadConfig } from '../src/config/env.js';
import { closePool, databaseStatus, hasDatabaseConfig } from '../src/db/client.js';
import { jsonDatabaseStatus } from '../src/db/jsonStore.js';

const config = loadConfig();

let status;
if (config.dbDriver === 'pg') {
  if (!hasDatabaseConfig(config)) {
    console.error('DB_DRIVER=pg but DATABASE_URL (or DATABASE_HOST/NAME/USER) is not configured.');
    process.exit(1);
  }
  status = await databaseStatus(config);
} else {
  status = await jsonDatabaseStatus(config);
}

console.log(JSON.stringify(status, null, 2));

await closePool().catch(() => {});
process.exitCode = status.ok ? 0 : 1;
