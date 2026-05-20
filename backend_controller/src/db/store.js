// Store factory: returns a backend-agnostic record store.
//
// Existing services import from `./jsonStore.js` directly, so this module is
// additive — call `getStore(config)` from new code that wants to be driver
// agnostic. Existing call sites are unchanged.

import * as jsonStore from './jsonStore.js';
import * as pgAdapter from './pgAdapter.js';

export function getStore(config) {
  return config && config.dbDriver === 'pg' ? pgAdapter : jsonStore;
}

// Convenience re-export of the json store for callers that explicitly want it.
export { jsonStore, pgAdapter };
