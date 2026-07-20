import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { createMockProvider } from './mockProvider.js';
import { createRazorpayProvider } from './razorpayProvider.js';

const providers = new Map();

const KNOWN_PROVIDERS = new Set(['mock', 'razorpay']);

/**
 * Resolve a payment provider instance.
 *
 * Precedence:
 *   1. Caller-supplied `preferredProvider` always wins (must be a known name).
 *   2. Otherwise read `config.providerMode`:
 *        - 'live'                  -> razorpay
 *        - 'razorpay'              -> razorpay  (alias)
 *        - 'mock'                  -> mock      (alias)
 *        - 'development'/'staging' -> mock      (legacy modes; non-live = test)
 *   3. Default: mock.
 *
 * Razorpay requires `razorpayKeyId` and `razorpayKeySecret`. A descriptive
 * error is thrown when the caller explicitly requests razorpay without keys.
 */
export function getPaymentProvider(config: AppConfig, preferredProvider: string | null = null) {
  let providerName;
  if (preferredProvider) {
    if (!KNOWN_PROVIDERS.has(preferredProvider)) {
      throw new Error(
        `Unknown payment provider '${preferredProvider}'. Expected one of: ${[...KNOWN_PROVIDERS].join(', ')}.`,
      );
    }
    providerName = preferredProvider;
  } else {
    const mode = String(config?.providerMode || '').toLowerCase();
    if (mode === 'live' || mode === 'razorpay') {
      providerName = 'razorpay';
    } else if (mode === 'mock' || mode === 'development' || mode === 'staging' || mode === '') {
      providerName = 'mock';
    } else {
      providerName = 'mock';
    }
  }

  // Cache key: razorpay instances depend on credentials; mock is stateless.
  const cacheKey = providerName === 'razorpay'
    ? `razorpay:${config?.razorpayKeyId || ''}`
    : 'mock';

  const cached = providers.get(cacheKey);
  if (cached) return cached;

  let provider;
  if (providerName === 'razorpay') {
    if (!config?.razorpayKeyId || !config?.razorpayKeySecret) {
      throw new Error(
        'Razorpay provider requested but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured.',
      );
    }
    provider = createRazorpayProvider(config);
  } else {
    provider = createMockProvider();
  }

  providers.set(cacheKey, provider);
  return provider;
}

export function clearProviderCache() {
  providers.clear();
}
