import { loadConfig } from '../src/config/env.js';
import { createRouter } from '../src/shared/routes/index.js';

const router = createRouter({ config: loadConfig(), logger: { info() {} } });
const adminRoutes = router.describe().filter((route) => route.path.startsWith('/v1/admin'));

const violations = adminRoutes.filter((route) => {
  if (route.auth === false) return true;
  if (!Array.isArray(route.roles)) return true;
  return !route.roles.includes('admin');
});

if (violations.length > 0) {
  console.error('Admin RBAC route check failed.');
  for (const route of violations) {
    const auth = route.auth === false ? 'public' : 'authenticated';
    const roles = Array.isArray(route.roles) && route.roles.length > 0
      ? route.roles.join(',')
      : 'none';
    console.error(`${route.method} ${route.path} auth=${auth} roles=${roles}`);
  }
  process.exit(1);
}

console.log(`Admin RBAC route check passed: ${adminRoutes.length} /v1/admin routes require role admin.`);
