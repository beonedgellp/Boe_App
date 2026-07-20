import { registerAuthRoutes } from './authRoutes.js';
import { registerHealthRoutes } from './healthRoutes.js';

// Only routes both audiences fundamentally need (health + auth) live here, so an
// admin-only or client-only server (createRouter({ groups: [...] })) mounts a clean
// surface. Audience-specific routes are registered by their own group:
//   - client: webhooks, client receipts/timeline (see clientRoutes.js)
//   - admin:  internal, admin receipts/timeline (see adminRoutes.js)
export function registerSharedRoutes(router) {
  registerHealthRoutes(router);
  registerAuthRoutes(router);
}
