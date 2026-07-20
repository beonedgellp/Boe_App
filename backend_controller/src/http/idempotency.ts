// Idempotency-Key middleware for client POST routes.
//
// Wraps a route handler so that, when the client sends an `Idempotency-Key`
// request header, identical retries return the stored response without
// re-running the handler. Different request bodies under the same key are
// rejected with 409 IDEMPOTENCY_KEY_REUSED. Concurrent in-flight retries
// share the same Promise and observe a single side-effect.
//
// Header presence is OPTIONAL — when absent the handler runs normally.
//
// Storage: `request_idempotency` table in PostgreSQL.

import { createHash } from 'node:crypto';
import { HttpError } from './errors.js';
import {
  findRecord,
  insertJsonRecord,
  updateJsonRecord,
  deleteJsonRecord,
} from '#db/pgAdapter.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const IN_FLIGHT_TIMEOUT_MS = 30_000;

// Process-local map keyed by dedup key → Promise<{ status, body }>.
// Prevents two concurrent requests with the same key from both running the
// handler. Survives only within a single Node process; persistence layer
// catches cross-process duplicates after the first one commits.
const inFlight = new Map();

const HEADER_NAME = 'idempotency-key';

function readHeader(headers) {
  if (!headers) return null;
  const raw = headers[HEADER_NAME] ?? headers[HEADER_NAME.toUpperCase()];
  if (raw == null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

function hashBody(req, body) {
  const raw = req?.rawBody;
  let canonical;
  if (typeof raw === 'string' && raw.length > 0) {
    canonical = raw;
  } else if (body == null) {
    canonical = '';
  } else {
    canonical = JSON.stringify(body);
  }
  return createHash('sha256').update(canonical).digest('hex');
}

function dedupKey(userId, routePath, key) {
  return `${userId || 'anon'}:${routePath}:${key}`;
}

function normalizeHandlerResult(result) {
  if (result == null) return { status: 204, body: null };
  if (typeof result === 'object' && typeof result.status === 'number' && 'body' in result) {
    return { status: result.status, body: result.body };
  }
  return { status: 200, body: result };
}

function withReplayHeader(stored) {
  return {
    status: stored.status,
    body: stored.body,
    headers: { 'idempotent-replay': 'true' },
  };
}

/**
 * Wrap a route handler with Idempotency-Key behavior.
 *
 * @param {string} routePath - the registered route path (used to scope keys)
 * @param {(ctx: object) => any} handler
 * @returns {(ctx: object) => Promise<any>}
 */
export function withIdempotency(routePath, handler) {
  return async function idempotencyWrapped(context) {
    const { headers, actor, body, req, config } = context;
    const key = readHeader(headers);

    if (!key) {
      return handler(context);
    }

    const userId = actor?.userId || null;
    const dk = dedupKey(userId, routePath, key);
    const requestHash = hashBody(req, body);

    // Same-process concurrency: if another request with this dedup key is
    // already running, await its result. We register the Promise in the
    // in-flight map synchronously (before any await) so a second concurrent
    // request observes it.
    const pending = inFlight.get(dk);
    if (pending) {
      let result;
      try {
        result = await pending;
      } catch (error) {
        // First-runner failed. Surface the same error to the second caller
        // rather than silently retrying — the persistent row was rolled
        // back, so the client can retry.
        throw error;
      }
      if (result.requestHash && result.requestHash !== requestHash) {
        throw new HttpError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency-Key reused with a different request body',
        );
      }
      return {
        status: result.status,
        body: result.body,
        headers: { 'idempotent-replay': 'true' },
      };
    }

    const runHandler = (async () => {
      // Persisted lookup
      const { item: existing } = await findRecord(
        config,
        'requestIdempotency',
        (r) => r.key === dk,
      );

      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new HttpError(
            409,
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency-Key reused with a different request body',
          );
        }
        if (existing.status === 'pending') {
          const ageMs = Date.now() - new Date(existing.createdAt).getTime();
          if (ageMs < IN_FLIGHT_TIMEOUT_MS) {
            throw new HttpError(
              409,
              'IDEMPOTENCY_IN_FLIGHT',
              'A request with this Idempotency-Key is already in flight. Retry shortly.',
            );
          }
          // Stale pending row — drop it so this caller can retry.
          await deleteJsonRecord(config, 'requestIdempotency', (r) => r.key === dk);
        } else {
          return {
            status: existing.responseStatus,
            body: existing.responseBody,
            requestHash: existing.requestHash,
            replayed: true,
          };
        }
      }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
      await insertJsonRecord(config, 'requestIdempotency', {
        key: dk,
        route: routePath,
        userId,
        requestHash,
        status: 'pending',
        responseStatus: null,
        responseBody: null,
        createdAt: now,
        expiresAt,
      });

      try {
        const raw = await handler(context);
        const normalized = normalizeHandlerResult(raw);
        await updateJsonRecord(
          config,
          'requestIdempotency',
          (r) => r.key === dk,
          (existingRow) => ({
            ...existingRow,
            status: 'completed',
            responseStatus: normalized.status,
            responseBody: normalized.body,
            completedAt: new Date().toISOString(),
          }),
        );
        return { status: normalized.status, body: normalized.body, requestHash };
      } catch (error) {
        await deleteJsonRecord(config, 'requestIdempotency', (r) => r.key === dk).catch(() => {});
        throw error;
      }
    })().finally(() => {
      inFlight.delete(dk);
    });

    inFlight.set(dk, runHandler);

    const result = await runHandler;
    if (result.replayed) {
      return {
        status: result.status,
        body: result.body,
        headers: { 'idempotent-replay': 'true' },
      };
    }
    return { status: result.status, body: result.body };
  };
}

// Test/dev helper — clears the in-process in-flight map.
export function _resetInFlight() {
  inFlight.clear();
}
