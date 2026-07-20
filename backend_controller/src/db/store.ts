// Store factory: returns the Postgres adapter.
//
// Postgres is the sole supported data store. This module re-exports pgAdapter
// for backward compatibility with existing `getStore(config)` callers.

import * as pgAdapter from './pgAdapter.js';
import type { AppConfig } from '#types/index.js';

export type Store = typeof pgAdapter;

export function getStore(_config?: AppConfig): Store {
  return pgAdapter;
}

export { pgAdapter };
