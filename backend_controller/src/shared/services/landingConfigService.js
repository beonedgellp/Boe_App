import { getPublishedConfigVersion, publishConfigVersion } from './appConfigService.js';
import { validateLandingConfig } from './landingConfigSchema.js';

export const LANDING_CONFIG_KEY = 'landing_page';

export async function getPublishedLandingConfig(config) {
  return getPublishedConfigVersion(config, LANDING_CONFIG_KEY);
}

export async function publishLandingConfig(config, actor, body, requestContext = {}) {
  const incoming = validateLandingConfig(body?.config ?? body);

  return publishConfigVersion(config, LANDING_CONFIG_KEY, actor, incoming, {
    reason: body?.reason,
    defaultReason: 'Admin published landing page configuration.',
    auditAction: 'landing_config.publish',
    entityType: 'landing_config',
    requestContext,
  });
}
