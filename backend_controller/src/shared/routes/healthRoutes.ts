import type { Router } from '#http/router.js';
import { Routes } from './constants.js';
import { health, reachability } from '../services/healthService.js';

export function registerHealthRoutes(router: Router) {
  router.get(Routes.GET_HEALTH, {
    group: 'public',
    auth: false,
    description: 'Process health and runtime configuration warnings.',
  }, ({ config }) => health(config));

  router.get(Routes.GET_V1_HEALTH, {
    group: 'public',
    auth: false,
    description: 'Versioned process health.',
  }, ({ config }) => health(config));

  router.get(Routes.GET_V1_SYSTEM_REACHABILITY, {
    group: 'client',
    auth: false,
    description: 'Client app reachability and minimum version.',
  }, ({ config }) => reachability(config));
}
