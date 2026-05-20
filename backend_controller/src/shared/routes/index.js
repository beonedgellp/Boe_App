import { Router } from '../../http/router.js';
import { registerAdminRoutes } from '../../admin/routes/adminRoutes.js';
import { registerAuthRoutes } from './authRoutes.js';
import { registerClientRoutes } from '../../client/routes/clientRoutes.js';
import { registerHealthRoutes } from './healthRoutes.js';
import { registerInternalRoutes } from './internalRoutes.js';
import { registerPublicRoutes } from '../../website/routes/publicRoutes.js';
import { registerWebhookRoutes } from './webhookRoutes.js';
import { registerTimelineRoutes } from './timelineRoutes.js';
import { registerReceiptRoutes } from './receiptRoutes.js';

export function createRouter({ config, logger }) {
  const router = new Router({ config, logger });

  registerHealthRoutes(router);
  registerAuthRoutes(router);
  registerPublicRoutes(router);
  registerClientRoutes(router);
  registerAdminRoutes(router);
  registerWebhookRoutes(router);
  registerReceiptRoutes(router);
  registerTimelineRoutes(router);
  registerInternalRoutes(router);

  return router;
}
