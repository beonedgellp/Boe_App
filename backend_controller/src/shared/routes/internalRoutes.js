import { Routes } from './constants.js';

export function registerInternalRoutes(router) {
  router.get(Routes.GET_V1_INTERNAL_ROUTES, {
    group: 'internal',
    roles: ['admin'],
    description: 'Registered route metadata for operations tooling.',
  }, () => router.describe());
}
