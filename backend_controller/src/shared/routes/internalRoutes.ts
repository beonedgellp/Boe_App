import type { Router } from '#http/router.js';
import { Routes } from './constants.js';

export function registerInternalRoutes(router: Router) {
  router.get(Routes.GET_V1_INTERNAL_ROUTES, {
    group: 'internal',
    roles: ['admin'],
    description: 'Registered route metadata for operations tooling.',
  }, () => router.describe());
}
