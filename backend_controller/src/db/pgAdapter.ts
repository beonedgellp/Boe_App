// Postgres adapter providing the data-store surface used by services and scripts.
//
// Design notes:
// - Reuses `query` / `transaction` from `db/client.js` (which manages the pool).
// - Each JSON "collection" maps to one Postgres table via `COLLECTION_MAP` below.
// - Idempotency-key paths use INSERT ... ON CONFLICT ... DO NOTHING RETURNING.

import { query, transaction, hasDatabaseConfig, databaseStatus } from './client.js';
import type { PoolClient, QueryResultRow } from 'pg';
import type { AppConfig, DatabaseStatus, StoreRecord } from '#types/index.js';

interface CollectionMapping {
  table: string;
  idColumn: string;
}

type StoreSnapshot = Record<string, StoreRecord[]>;
type RecordUpdater = ((existing: StoreRecord) => StoreRecord) | Partial<StoreRecord>;

function isPgError(err: unknown, code: string): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === code);
}

// -------------------- collection ↔ table mapping --------------------

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_full, c: string) => c.toUpperCase());
}

function rowToRecord(row: QueryResultRow | null | undefined): StoreRecord | null {
  if (!row) return null;
  const out: StoreRecord = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

const COLLECTION_MAP: Record<string, CollectionMapping> = {
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

  // Idempotency storage
  requestIdempotency: { table: 'request_idempotency', idColumn: 'id' },
};

function mappingFor(collection: string): CollectionMapping {
  const m = COLLECTION_MAP[collection];
  if (!m) {
    throw new Error(`pgAdapter: unknown collection '${collection}'.`);
  }
  return m;
}

// -------------------- column inference --------------------

const TABLES_WITH_PAYLOAD = new Set<string>([
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

export async function readJsonStore(config: AppConfig): Promise<StoreSnapshot> {
  const out: StoreSnapshot = {};
  for (const [collection, m] of Object.entries(COLLECTION_MAP)) {
    try {
      const r = await query(config, `SELECT * FROM ${m.table}`);
      out[collection] = r.rows.map(rowToRecord).filter((row): row is StoreRecord => row !== null);
    } catch (err) {
      // Table may not exist yet (migrations not applied). Default to empty.
      if (isPgError(err, '42P01')) {
        out[collection] = [];
      } else {
        throw err;
      }
    }
  }
  return out;
}

// No-op in pg mode: the store is the database. Kept for interface parity.
export async function writeJsonStore(): Promise<void> {
  return;
}

export async function updateJsonStore<T>(
  config: AppConfig,
  updater: (store: StoreSnapshot) => T | Promise<T>,
): Promise<T> {
  return transaction(config, async (client) => {
    const before = await readJsonStore(config);
    const beforeSnapshot: StoreSnapshot = JSON.parse(JSON.stringify(before));
    const result = await updater(before);

    // Write deltas per collection.
    for (const [collection, m] of Object.entries(COLLECTION_MAP)) {
      const current = before[collection] || [];
      const previous = beforeSnapshot[collection] || [];
      const idKey = snakeToCamel(m.idColumn);
      const previousById = new Map(previous.map((r) => [r[idKey], r]));

      for (const record of current) {
        const id = record[idKey];
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

export interface CompositeWriteOp {
  collection: string;
  record: StoreRecord;
}

export async function atomicCompositeWrite(config: AppConfig, operations: CompositeWriteOp[]): Promise<void> {
  return transaction(config, async (client) => {
    for (const op of operations) {
      await insertWithClient(client, op.collection, op.record);
    }
  });
}

// -------------------- granular helpers --------------------

export async function insertJsonRecord(
  config: AppConfig,
  collection: string,
  record: StoreRecord,
): Promise<StoreRecord | null> {
  return transaction(config, async (client) => insertWithClient(client, collection, record));
}

export interface FindResult {
  item: StoreRecord | null;
  store: null;
}

export async function findRecord(
  config: AppConfig,
  collection: string,
  predicate: (record: StoreRecord) => boolean,
): Promise<FindResult> {
  const m = mappingFor(collection);
  let rows: StoreRecord[];
  try {
    const r = await query(config, `SELECT * FROM ${m.table}`);
    rows = r.rows.map(rowToRecord).filter((row): row is StoreRecord => row !== null);
  } catch (err) {
    if (isPgError(err, '42P01')) return { item: null, store: null };
    throw err;
  }
  const item = rows.find(predicate) || null;
  return { item, store: null };
}

export async function updateJsonRecord(
  config: AppConfig,
  collection: string,
  predicate: (record: StoreRecord) => boolean,
  updater: RecordUpdater,
): Promise<StoreRecord | null> {
  const m = mappingFor(collection);
  const r = await query(config, `SELECT * FROM ${m.table}`);
  const rows = r.rows.map(rowToRecord).filter((row): row is StoreRecord => row !== null);
  const idx = rows.findIndex(predicate);
  if (idx === -1) return null;
  const existing = rows[idx];
  const next = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
  await updateById(config, collection, existing[snakeToCamel(m.idColumn)], next);
  return next;
}

export async function updatePayment(config: AppConfig, id: unknown, updater: UpdaterFn): Promise<StoreRecord | null> {
  return updateByIdWithUpdater(config, 'payments', id, updater);
}

export async function updateMandate(config: AppConfig, id: unknown, updater: UpdaterFn): Promise<StoreRecord | null> {
  return updateByIdWithUpdater(config, 'mandates', id, updater);
}

export async function updateSipControlRequest(config: AppConfig, id: unknown, updater: UpdaterFn): Promise<StoreRecord | null> {
  return updateByIdWithUpdater(config, 'sipControlRequests', id, updater);
}

export async function deleteJsonRecord(
  config: AppConfig,
  collection: string,
  predicate: (record: StoreRecord) => boolean,
): Promise<StoreRecord | null> {
  const m = mappingFor(collection);
  let rows: StoreRecord[];
  try {
    const r = await query(config, `SELECT * FROM ${m.table}`);
    rows = r.rows.map(rowToRecord).filter((row): row is StoreRecord => row !== null);
  } catch (err) {
    if (isPgError(err, '42P01')) return null;
    throw err;
  }
  const idx = rows.findIndex(predicate);
  if (idx === -1) return null;
  const existing = rows[idx];
  const id = existing[snakeToCamel(m.idColumn)];
  await query(config, `DELETE FROM ${m.table} WHERE ${m.idColumn} = $1`, [id]);
  return existing;
}

// The mutator receives the existing row and (in legacy JSON mode) a store handle.
// Both are dynamically shaped, so the callback operates on `any`.
type UpdaterFn = (existing: any, store: any) => any;

async function updateByIdWithUpdater(
  config: AppConfig,
  collection: string,
  id: unknown,
  updater: UpdaterFn,
): Promise<StoreRecord | null> {
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

interface BuiltInsert {
  sql: string;
  values: unknown[];
}

function buildInsert(table: string, record: StoreRecord, hasPayload: boolean): BuiltInsert {
  const cols: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  const payloadExtras: StoreRecord = {};
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

function serializeValue(v: unknown): unknown {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    return JSON.stringify(v);
  }
  return v;
}

async function insertWithClient(
  client: PoolClient,
  collection: string,
  record: StoreRecord,
): Promise<StoreRecord | null> {
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

async function updateById(
  config: AppConfig,
  collection: string,
  id: unknown,
  record: StoreRecord,
): Promise<StoreRecord | null> {
  return transaction(config, async (client) => updateByIdWithClient(client, collection, id, record));
}

async function updateByIdWithClient(
  client: PoolClient,
  collection: string,
  id: unknown,
  record: StoreRecord,
): Promise<StoreRecord | null> {
  const m = mappingFor(collection);
  const hasPayload = TABLES_WITH_PAYLOAD.has(m.table);

  const sets: string[] = [];
  const values: unknown[] = [];
  const payloadExtras: StoreRecord = {};
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

export async function jsonDatabaseStatus(config: AppConfig): Promise<DatabaseStatus> {
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
