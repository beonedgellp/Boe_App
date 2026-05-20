import { loadConfig } from '../src/config/env.js';
import { createRouter } from '../src/shared/routes/index.js';

const router = createRouter({ config: loadConfig(), logger: { info() {} } });

for (const route of router.describe()) {
  const auth = route.auth ? `roles=${route.roles.join(',') || 'authenticated'}` : 'public';
  console.log(`${route.method.padEnd(5)} ${route.path.padEnd(48)} ${route.group.padEnd(18)} ${auth}`);
}
