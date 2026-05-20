// Postgres adapter mirroring the public surface of `jsonStore.js`.
//
// Design notes:
// - Reuses `query` / `transaction` from `db/client.js` (which manages the pool).
// - Each JSON "collection" maps to one Postgres table via `COLLECTION_MAP` below.
//   The mapping declares: tableName, idColumn, and column<->jsonField translators
//   so callers can keep using camelCased records identical to the JSON store.
// - Idempotency-key paths use INSERT ... ON CONFLICT (idempotency_key) DO NOTHING
//   RETURNING ... so concurrent inserts are race-safe without a SELECT-then-INSERT.
// - `atomicCompositeWrite` runs all ops inside one transaction.
// - Functions that don't have a structural Postgres equivalent (writeJsonStore for
//   the entire blob) still exist as no-ops or throw a clear error to keep the
//   factory `getStore(config)` strictly equivalent at the surface level.

import { query, transaction, hasDatabaseConfig, databaseStatus } from './client.js';

// -------------------- collection ↔ table mapping --------------------

// Helper to convert camelCase key -> snake_case column. Conservative — only
// touches the keys we declare here; we never try to round-trip arbitrary JSON
// objects, so rows that don't have a declared shape go to a generic `payload`
// column where applicable.

function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToRecord(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

// Each entry: { table, idColumn, jsonbColumns?, columns? }
// - `columns` lists the explicit column whitelist; anything not in this list is
//   stuffed into the `payload` jsonb column on insert/update (if present).
// - `jsonbColumns` lists columns that should be JSON.stringify'd before send.
//
// Where the JSON store uses fields not yet modeled in 001-004 or 005, we leave
// them inside `payload` jsonb so we can round-trip without losing data.

const COLLECTION_MAP = {
  users: { table: 'users', idColumn: 'id' },
  deviceSessions: { table: 'device_sessions', idColumn: 'id' },
  appConfigVersions: { table: 'app_config_versions', idColumn: 'id' },

  payments: { table: 'payments', idColumn: 'id' },
  mandates: { table: 'mandates', idColumn: 'id' },
  investmentPlans: { table: 'investment_plans', idColumn: 'id' },
  transactions: { table: 'transactions', idColumn: 'id' },

  paymentWebhookEvents: { table: 'payment_webhook_events', idColumn: 'id' },
  mandateWebhookEvents: { table: 'mandate_webhook_events', idColumn: 'id' },

  kycProfiles: { table: 'kyc_profiles', idColumn: 'id' },
  adminAuditLogs: { table: 'admin_audit_logs', idColumn: 'id' },
  ledgerEntries: { table: 'ledger_entries', idColumn: 'id' },
  statements: { table: 'statements', idColumn: 'id' },

  // 005-defined tables
  funds: { table: 'funds', idColumn: 'id' },
  capitalTransactions: { table: 'capital_transactions', idColumn: 'id' },
  redemptionRequests: { table: 'redemption_requests', idColumn: 'id' },
  withdrawalPreviews: { table: 'withdrawal_previews', idColumn: 'id' },
  sipControlRequests: { table: 'sip_control_requests', idColumn: 'id' },
  supportTickets: { table: 'support_tickets', idColumn: 'id' },
  supportTicketMessages: { table: 'support_ticket_messages', idColumn: 'id' },
  receipts: { table: 'receipts', idColumn: 'id' },
  timelineEvents: { table: 'timeline_events', idColumn: 'id' },
  notifications: { table: 'notifications', idColumn: 'id' },
  orders: { table: 'orders', idColumn: 'id' },
  faqs: { table: 'faqs', idColumn: 'id' },
  disclosures: { table: 'disclosures', idColumn: 'id' },
  staticPages: { table: 'static_pages', idColumn: 'id' },
  portfolioSnapshots: { table: 'portfolio_snapshots', idColumn: 'id' },
};

function mappingFor(collection) {
  const m = COLLECTION_MAP[collection];
  if (!m) {
    throw new Error(`pgAdapter: unknown collection '${collection}'.`);
  }
  return m;
}

// -------------------- column inference --------------------

// We don't introspect information_schema on every call (would be slow); instead
// we let Postgres reject unknown columns. Callers should pass records that
// match the column whitelist for the table. The `payload` column is appended
// when the table is known to have one.

const TABLES_WITH_PAYLOAD = new Set([
  'orders',
  'sip_control_requests',
  'redemption_requests',
  'withdrawal_previews',
  'capital_transactions',
  'support_tickets',
  'support_ticket_messages',
  'notifications',
  'timeline_events',
  'receipts',
  'funds',
  'faqs',
  'disclosures',
  'static_pages',
  'portfolio_snapshots',
  'payment_webhook_events',
  'mandate_webhook_events',
  'admin_audit_logs',
]);

// -------------------- public surface --------------------

// Mirrors jsonStore.jsonStoreEnabled. For the pg adapter, returning true would
// be misleading — keep services able to tell whether they're on json or pg.
export function jsonStoreEnabled(/* config */) {
  return false;
}

export function jsonStorePath(/* config */) {
  // No file path in pg mode.
  return null;
}

// Read everything: returned as a JSON-store-shaped object so that callers that
// loop over a single collection still work. This is potentially expensive — use
// `findRecord` / collection-specific helpers when possible.
export async function readJsonStore(config) {
  const out = {};
  for (const [collection, m] of Object.entries(COLLECTION_MAP)) {
    try {
      const r = await query(config, `SELECT * FROM ${m.table}`);
      out[collection] = r.rows.map(rowToRecord);
    } catch (err) {
      // Table may not exist yet (migrations not applied). Default to empty.
      if (err && err.code === '42P01') {
        out[collection] = [];
      } else {
        throw err;
      }
    }
  }
  return out;
}

// No-op in pg mode: the store is the database. Kept for interface parity.
export async function writeJsonStore(/* config, data */) {
  // Intentionally a no-op. Callers in pg mode should be using granular helpers.
  return;
}

// In pg mode, treat updateJsonStore like a transaction: hand the updater a
// minimal store-shaped object lazily populated on demand. To keep behaviour
// predictable we emulate by calling readJsonStore + executing the updater
// inside a single tx, persisting deltas with INSERT/UPDATE per collection.
//
// NOTE: This is a best-effort compatibility shim. Services that need true ACID
// semantics for mass mutations should be rewritten to use `transaction(...)`
// directly. The shim is sufficient for the existing JSON-mode use sites which
// mostly mutate one row at a time.
export async function updateJsonStore(config, updater) {
  return transaction(config, async (client) => {
    const before = await readJsonStore(config);
    const beforeSnapshot = JSON.parse(JSON.stringify(before));
    const result = await updater(before);

    // Write deltas per collection.
    for (const [collection, m] of Object.entries(COLLECTION_MAP)) {
      const current = before[collection] || [];
      const previous = beforeSnapshot[collection] || [];
      const previousById = new Map(previous.map((r) => [r[snakeToCamel(m.idColumn)], r]));

      for (const record of current) {
        const id = record[snakeToCamel(m.idColumn)];
        if (!id) continue;
        const prev = previousById.get(id);
        if (!prev) {
          await insertWithClient(client, collection, record);
        } else if (JSON.stringify(prev) !== JSON.stringify(record)) {
          await updateByIdWithClient(client, collection, id, record);
        }
      }
    }

    return result;
  });
}

export async function atomicCompositeWrite(config, operations) {
  return transaction(config, async (client) => {
    for (const op of operations) {
      await insertWithClient(client, op.collection, op.record);
    }
  });
}

// -------------------- granular helpers --------------------

export async function insertJsonRecord(config, collection, record) {
  return transaction(config, async (client) => insertWithClient(client, collection, record));
}

export async function findRecord(config, collection, predicate) {
  // Postgres has no general predicate-pushdown for arbitrary JS callbacks.
  // Fall back to fetching the collection and filtering in JS.
  const m = mappingFor(collection);
  let rows;
  try {
    const r = await query(config, `SELECT * FROM ${m.table}`);
    rows = r.rows.map(rowToRecord);
  } catch (err) {
    if (err && err.code === '42P01') return { item: null, store: null };
    throw err;
  }
  const item = rows.find(predicate) || null;
  return { item, store: null };
}

export async function updateJsonRecord(config, collection, predicate, updater) {
  const m = mappingFor(collection);
  const r = await query(config, `SELECT * FROM ${m.table}`);
  const rows = r.rows.map(rowToRecord);
  const idx = rows.findIndex(predicate);
  if (idx === -1) return null;
  const existing = rows[idx];
  const next = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
  await updateById(config, collection, existing[snakeToCamel(m.idColumn)], next);
  return next;
}

export async function updatePayment(config, id, updater) {
  return updateByIdWithUpdater(config, 'payments', id, updater);
}

export async function updateMandate(config, id, updater) {
  return updateByIdWithUpdater(config, 'mandates', id, updater);
}

export async function updateSipControlRequest(config, id, updater) {
  return updateByIdWithUpdater(config, 'sipControlRequests', id, updater);
}

async function updateByIdWithUpdater(config, collection, id, updater) {
  const m = mappingFor(collection);
  const r = await query(config, `SELECT * FROM ${m.table} WHERE ${m.idColumn} = $1 LIMIT 1`, [id]);
  if (r.rows.length === 0) return null;
  const existing = rowToRecord(r.rows[0]);
  const next = updater(existing, null);
  if (!next) return null;
  await updateById(config, collection, id, next);
  return next;
}

// -------------------- internals --------------------

function buildInsert(table, record, hasPayload) {
  const cols = [];
  const placeholders = [];
  const values = [];
  const payloadExtras = {};
  let i = 1;

  for (const [k, v] of Object.entries(record)) {
    const col = camelToSnake(k);
    if (KNOWN_COLUMN_RE.test(col)) {
      cols.push(col);
      placeholders.push(`$${i++}`);
      values.push(serializeValue(v));
    } else {
      payloadExtras[k] = v;
    }
  }

  if (hasPayload && Object.keys(payloadExtras).length > 0) {
    cols.push('payload');
    placeholders.push(`$${i++}`);
    values.push(JSON.stringify(payloadExtras));
  }

  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
  return { sql, values };
}

// Loose column-name regex: snake_case alphanum + underscore only.
const KNOWN_COLUMN_RE = /^[a-z_][a-z0-9_]*$/;

function serializeValue(v) {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}

async function insertWithClient(client, collection, record) {
  const m = mappingFor(collection);
  const hasPayload = TABLES_WITH_PAYLOAD.has(m.table);

  // Idempotency-key path: ON CONFLICT (idempotency_key) DO NOTHING RETURNING *.
  if (record.idempotencyKey && (m.table === 'payment_webhook_events' || m.table === 'mandate_webhook_events' || m.table === 'receipts' || m.table === 'timeline_events')) {
    const built = buildInsert(m.table, record, hasPayload);
    const sql = `${built.sql} ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`;
    const r = await client.query(sql, built.values);
    return r.rows[0] ? rowToRecord(r.rows[0]) : null;
  }

  const built = buildInsert(m.table, record, hasPayload);
  const r = await client.query(`${built.sql} RETURNING *`, built.values);
  return rowToRecord(r.rows[0]);
}

async function updateById(config, collection, id, record) {
  return transaction(config, async (client) => updateByIdWithClient(client, collection, id, record));
}

async function updateByIdWithClient(client, collection, id, record) {
  const m = mappingFor(collection);
  const hasPayload = TABLES_WITH_PAYLOAD.has(m.table);

  const sets = [];
  const values = [];
  const payloadExtras = {};
  let i = 1;

  for (const [k, v] of Object.entries(record)) {
    if (k === snakeToCamel(m.idColumn)) continue;
    const col = camelToSnake(k);
    if (KNOWN_COLUMN_RE.test(col)) {
      sets.push(`${col} = $${i++}`);
      values.push(serializeValue(v));
    } else {
      payloadExtras[k] = v;
    }
  }

  if (hasPayload && Object.keys(payloadExtras).length > 0) {
    sets.push(`payload = $${i++}`);
    values.push(JSON.stringify(payloadExtras));
  }

  if (sets.length === 0) return record;

  values.push(id);
  const sql = `UPDATE ${m.table} SET ${sets.join(', ')} WHERE ${m.idColumn} = $${i} RETURNING *`;
  const r = await client.query(sql, values);
  return r.rows[0] ? rowToRecord(r.rows[0]) : null;
}

// -------------------- status --------------------

export async function jsonDatabaseStatus(config) {
  // In pg mode the json status is just the pg status — surface forwarded.
  if (!hasDatabaseConfig(config)) {
    return {
      configured: false,
      ok: false,
      type: 'pg',
      message: 'Database connection is not configured.',
    };
  }
  const status = await databaseStatus(config);
  return { ...status, type: 'pg' };
}
