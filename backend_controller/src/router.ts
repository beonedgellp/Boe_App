import { Router } from '#http/router.js';
import { registerAdminRoutes } from '#admin/routes/adminRoutes.js';
import { registerClientRoutes } from '#client/routes/clientRoutes.js';
import { registerPublicRoutes } from '#website/routes/publicRoutes.js';
import { registerSharedRoutes } from '#shared/routes/index.js';
import type { AppConfig, Logger, RouteGroup } from '#types/index.js';

export const ROUTE_GROUPS: RouteGroup[] = ['shared', 'website', 'client', 'admin'];

interface CreateRouterOptions {
  config: AppConfig;
  logger?: Partial<Logger>;
  groups?: RouteGroup[];
}

// Mount only the selected audience groups so a future admin-only or client-only
// service is a one-line composition (e.g. groups: ['shared', 'admin']) with no
// edits to the audience modules. Defaults to all groups (current behavior).
export function createRouter({ config, logger, groups = ROUTE_GROUPS }: CreateRouterOptions): Router {
  const router = new Router({ config, logger });

  if (groups.includes('shared')) registerSharedRoutes(router);
  if (groups.includes('website')) registerPublicRoutes(router);
  if (groups.includes('client')) registerClientRoutes(router);
  if (groups.includes('admin')) registerAdminRoutes(router);

  return router;
}
