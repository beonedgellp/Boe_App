import { Routes } from './constants.js';
import { buildTimelineForUser, getNextStepText } from '../services/timelineService.js';
import { getLatestVersion } from '../services/copyRegistry.js';

const CLIENT_ROLES = ['client', 'admin'];
const ADMIN_ROLES = ['admin'];

export function registerTimelineRoutes(router) {
  router.get(Routes.GET_V1_CLIENT_ME_TIMELINE, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Current user timeline events.',
  }, async ({ config, actor, query }) => {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Math.max(Number(query.offset) || 0, 0);
    const { events, total } = await buildTimelineForUser(config, actor.userId, { limit, offset });
    return { items: events, count: events.length, total, limit, offset };
  });

  router.get(Routes.GET_V1_ADMIN_USERS_USERID_TIMELINE, {
    group: 'admin',
    roles: ADMIN_ROLES,
    description: 'Admin view of user timeline.',
  }, async ({ config, params, query }) => {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Math.max(Number(query.offset) || 0, 0);
    const { events, total } = await buildTimelineForUser(config, params.userId, { limit, offset });
    return { items: events, count: events.length, total, limit, offset };
  });

  router.get(Routes.GET_V1_CLIENT_ME_TIMELINE_NEXT_STEP, {
    group: 'client',
    roles: CLIENT_ROLES,
    allowPendingClient: true,
    description: 'Next-step text for current money state.',
  }, async ({ config, actor, query }) => {
    const text = await getNextStepText(config, actor.userId, query.state);
    return { text, version: getLatestVersion() };
  });
}
