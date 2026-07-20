// Store factory: returns the Postgres adapter.
//
// Postgres is the sole supported data store. This module re-exports pgAdapter
// for backward compatibility with existing `getStore(config)` callers.

import * as pgAdapter from './pgAdapter.js';

export function getStore(/* config */) {
  return pgAdapter;
}

export { pgAdapter };
