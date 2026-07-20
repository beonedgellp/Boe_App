import type { RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { getPublishedConfigVersion, publishConfigVersion } from './appConfigService.js';
import { validateLandingConfig } from './landingConfigSchema.js';

export const LANDING_CONFIG_KEY = 'landing_page';

export async function getPublishedLandingConfig(config: AppConfig) {
  return getPublishedConfigVersion(config, LANDING_CONFIG_KEY);
}

export async function publishLandingConfig(config: AppConfig, actor: Actor, body: Record<string, any>, requestContext: RequestContext = {}) {
  const incoming = validateLandingConfig(body?.config ?? body);

  return publishConfigVersion(config, LANDING_CONFIG_KEY, actor, incoming, {
    reason: body?.reason,
    defaultReason: 'Admin published landing page configuration.',
    auditAction: 'landing_config.publish',
    entityType: 'landing_config',
    requestContext,
  });
}
