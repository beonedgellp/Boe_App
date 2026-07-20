import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { Router } from '#http/router.js';
import { Routes } from './constants.js';
import { processPaymentWebhook, processMandateWebhook } from '../services/webhookService.js';
import { HttpError } from '#http/errors.js';

const SUPPORTED_PROVIDERS = new Set(['mock', 'razorpay']);

/**
 * Gate provider acceptance for webhook routes.
 *
 * - `razorpay` is always accepted at the routing layer; signature
 *   verification (HMAC) inside the service enforces authenticity.
 * - `mock` is accepted only when `MOCK_WEBHOOK_ENABLED=true` (dev-only).
 *   It is forced off in production by `assertProductionConfig`.
 * - Anything else is rejected with 404.
 */
function assertProviderAccepted(provider: any, config: AppConfig) {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new HttpError(404, 'UNKNOWN_PROVIDER', `Webhook provider '${provider}' is not supported.`);
  }
  if (provider === 'mock' && !config.mockWebhookEnabled) {
    throw new HttpError(403, 'MOCK_WEBHOOKS_DISABLED', 'Mock webhooks are disabled in this environment.');
  }
}

export function registerWebhookRoutes(router: Router) {
  router.post(Routes.POST_V1_WEBHOOKS_PAYMENTS_PROVIDER, {
    group: 'provider-webhook',
    auth: false,
    description: 'Payment provider webhook receiver.',
  }, async ({ config, params, body, headers, req }) => {
    const provider = params.provider;
    assertProviderAccepted(provider, config);
    // HMAC must be verified against the exact bytes received. `readJsonBody`
    // attaches the raw UTF-8 string to req.rawBody before JSON.parse; fall
    // back to the parsed body only when no raw was captured (e.g. empty body).
    const rawBody = typeof req?.rawBody === 'string' ? req.rawBody : body;
    return processPaymentWebhook(config, provider, rawBody, headers);
  });

  router.post(Routes.POST_V1_WEBHOOKS_MANDATES_PROVIDER, {
    group: 'provider-webhook',
    auth: false,
    description: 'Mandate provider webhook receiver.',
  }, async ({ config, params, body, headers, req }) => {
    const provider = params.provider;
    assertProviderAccepted(provider, config);
    const rawBody = typeof req?.rawBody === 'string' ? req.rawBody : body;
    return processMandateWebhook(config, provider, rawBody, headers);
  });
}
