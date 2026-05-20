import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_JSON_DB_PATH = './data/dev-db.json';
const jsonStoreQueues = new Map();

function enqueueJsonStore(filePath, operation) {
  const previous = jsonStoreQueues.get(filePath) || Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  const tail = next.catch(() => {}).then(() => {
    if (jsonStoreQueues.get(filePath) === tail) {
      jsonStoreQueues.delete(filePath);
    }
  });
  jsonStoreQueues.set(filePath, tail);
  return next;
}

function defaultStore() {
  return {
    users: [],
    deviceSessions: [],
    appConfigVersions: [],
    payments: [],
    mandates: [],
    investmentPlans: [],
    transactions: [],
    sipControlRequests: [],
    supportTickets: [],
    funds: [],
    adminAuditLogs: [],
    reconciliationLedger: [],
    capitalTransactions: [],
    redemptionRequests: [],
    paymentWebhookEvents: [],
    mandateWebhookEvents: [],
    kycProfiles: [],
    withdrawalPreviews: [],
    receipts: [],
    timelineEvents: [],
    requestIdempotency: [],
    approvalMigrationVersion: 0,
  };
}

function normalizeStore(value) {
  return {
    ...defaultStore(),
    ...(value && typeof value === 'object' ? value : {}),
    users: Array.isArray(value?.users) ? value.users : [],
    deviceSessions: Array.isArray(value?.deviceSessions) ? value.deviceSessions : [],
    appConfigVersions: Array.isArray(value?.appConfigVersions) ? value.appConfigVersions : [],
    payments: Array.isArray(value?.payments) ? value.payments : [],
    mandates: Array.isArray(value?.mandates) ? value.mandates : [],
    investmentPlans: Array.isArray(value?.investmentPlans) ? value.investmentPlans : [],
    transactions: Array.isArray(value?.transactions) ? value.transactions : [],
    sipControlRequests: Array.isArray(value?.sipControlRequests) ? value.sipControlRequests : [],
    supportTickets: Array.isArray(value?.supportTickets) ? value.supportTickets : [],
    funds: Array.isArray(value?.funds) ? value.funds : [],
    adminAuditLogs: Array.isArray(value?.adminAuditLogs) ? value.adminAuditLogs : [],
    reconciliationLedger: Array.isArray(value?.reconciliationLedger) ? value.reconciliationLedger : [],
    capitalTransactions: Array.isArray(value?.capitalTransactions) ? value.capitalTransactions : [],
    redemptionRequests: Array.isArray(value?.redemptionRequests) ? value.redemptionRequests : [],
    paymentWebhookEvents: Array.isArray(value?.paymentWebhookEvents) ? value.paymentWebhookEvents : [],
    mandateWebhookEvents: Array.isArray(value?.mandateWebhookEvents) ? value.mandateWebhookEvents : [],
    kycProfiles: Array.isArray(value?.kycProfiles) ? value.kycProfiles : [],
    receipts: Array.isArray(value?.receipts) ? value.receipts : [],
    timelineEvents: Array.isArray(value?.timelineEvents) ? value.timelineEvents : [],
    requestIdempotency: Array.isArray(value?.requestIdempotency) ? value.requestIdempotency : [],
    approvalMigrationVersion: Number.isInteger(value?.approvalMigrationVersion) ? value.approvalMigrationVersion : 0,
  };
}

function migrateStore(store) {
  let changed = false;

  if (store.approvalMigrationVersion < 1) {
    const now = new Date().toISOString();
    for (const user of store.users) {
      if (!user.approvalRef) {
        user.approvalRef = randomUUID();
        changed = true;
      }

    }
    store.approvalMigrationVersion = 1;
    changed = true;
  }

  if (store.approvalMigrationVersion < 2) {
    for (const payment of store.payments) {
      if (typeof payment.attemptCount !== 'number') {
        payment.attemptCount = 0;
        changed = true;
      }
      if (!('lastFailureReason' in payment)) {
        payment.lastFailureReason = null;
        changed = true;
      }
    }
    store.approvalMigrationVersion = 2;
    changed = true;
  }

  if (store.approvalMigrationVersion < 3) {
    if (!Array.isArray(store.kycProfiles)) store.kycProfiles = [];
    for (const user of store.users) {
      const exists = store.kycProfiles.some((p) => p.userId === user.id);
      if (!exists) {
        store.kycProfiles.push({
          id: randomUUID(),
          userId: user.id,
          panNumberEncrypted: null,
          panLast4: null,
          aadhaarLast4: null,
          addressJson: {},
          documentRefsJson: [],
          fatcaStatus: 'not_started',
          fatcaDeclaration: null,
          nominees: [],
          reKycDueDate: null,
          reKycTriggerReason: null,
          reviewStatus: user.kycStatus || 'not_started',
          adminNotes: null,
          reviewedBy: null,
          reviewedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        changed = true;
      }
    }
    store.approvalMigrationVersion = 3;
    changed = true;
  }

  if (store.approvalMigrationVersion < 4) {
    for (const preview of store.withdrawalPreviews || []) {
      if (!preview.taxConfigVersion) {
        const stcgRate = preview.assumptions?.stcgRate;
        if (stcgRate === 0.20) {
          preview.taxConfigVersion = 'post_2024_07_23';
        } else if (stcgRate === 0.15) {
          preview.taxConfigVersion = 'pre_2024_07_23';
        } else {
          preview.taxConfigVersion = 'pre_2024_07_23';
        }
        changed = true;
      }
    }
    store.approvalMigrationVersion = 4;
    changed = true;
  }

  if (store.approvalMigrationVersion < 5) {
    const now = new Date().toISOString();
    if (!Array.isArray(store.receipts)) store.receipts = [];

    for (const payment of store.payments || []) {
      const exists = store.receipts.some((r) => r.entityType === 'payment' && r.entityId === payment.id);
      if (!exists) {
        store.receipts.push({
          id: randomUUID(),
          kind: payment.status === 'success' ? 'payment_confirmed' : 'payment_retried',
          actor: { userId: payment.userId, role: 'client' },
          subjectUserId: payment.userId,
          entityType: 'payment',
          entityId: payment.id,
          beforeState: null,
          afterState: payment.status,
          amount: payment.amount ?? null,
          currency: payment.currency || 'INR',
          asOfTimestamp: payment.updatedAt || payment.createdAt || now,
          source: payment.provider || 'mock',
          consentOrDisclosureSnapshotRef: null,
          taxRegimeVersion: null,
          createdAt: now,
        });
        changed = true;
      }
    }

    for (const mandate of store.mandates || []) {
      const exists = store.receipts.some((r) => r.entityType === 'mandate' && r.entityId === mandate.id);
      if (!exists) {
        store.receipts.push({
          id: randomUUID(),
          kind: mandate.status === 'active' ? 'mandate_authorized' : 'mandate_authorized',
          actor: { userId: mandate.userId, role: 'client' },
          subjectUserId: mandate.userId,
          entityType: 'mandate',
          entityId: mandate.id,
          beforeState: null,
          afterState: mandate.status,
          amount: mandate.maxAmount ?? null,
          currency: 'INR',
          asOfTimestamp: mandate.updatedAt || mandate.createdAt || now,
          source: mandate.provider || 'mock',
          consentOrDisclosureSnapshotRef: null,
          taxRegimeVersion: null,
          createdAt: now,
        });
        changed = true;
      }
    }

    for (const req of store.sipControlRequests || []) {
      const exists = store.receipts.some((r) => r.entityType === 'sip_control_request' && r.entityId === req.id);
      if (!exists) {
        store.receipts.push({
          id: randomUUID(),
          kind: 'sip_control_requested',
          actor: { userId: req.userId, role: 'client' },
          subjectUserId: req.userId,
          entityType: 'sip_control_request',
          entityId: req.id,
          beforeState: null,
          afterState: req.status,
          amount: null,
          currency: null,
          asOfTimestamp: req.updatedAt || req.createdAt || now,
          source: 'derived',
          consentOrDisclosureSnapshotRef: null,
          taxRegimeVersion: null,
          createdAt: now,
        });
        changed = true;
      }
    }

    for (const req of store.redemptionRequests || []) {
      const exists = store.receipts.some((r) => r.entityType === 'redemption' && r.entityId === req.id);
      if (!exists) {
        store.receipts.push({
          id: randomUUID(),
          kind: 'withdrawal_submitted',
          actor: { userId: req.userId, role: 'client' },
          subjectUserId: req.userId,
          entityType: 'redemption',
          entityId: req.id,
          beforeState: null,
          afterState: req.status,
          amount: req.amount ?? null,
          currency: 'INR',
          asOfTimestamp: req.updatedAt || req.createdAt || now,
          source: 'derived',
          consentOrDisclosureSnapshotRef: null,
          taxRegimeVersion: null,
          createdAt: now,
        });
        changed = true;
      }
    }

    store.approvalMigrationVersion = 5;
    changed = true;
  }

  if (store.approvalMigrationVersion < 6) {
    for (const plan of store.investmentPlans || []) {
      if (!('disclosureTextHash' in plan) && plan.disclosureTextSnapshot) {
        plan.disclosureTextHash = createHash('sha256').update(plan.disclosureTextSnapshot).digest('hex').slice(0, 16);
        changed = true;
      }
    }
    store.approvalMigrationVersion = 6;
    changed = true;
  }

  if (store.approvalMigrationVersion < 7) {
    for (const req of store.redemptionRequests || []) {
      if (!('requiresDualApproval' in req)) {
        req.requiresDualApproval = false;
        changed = true;
      }
      if (!('dualApprovalThresholdConfigVersion' in req)) {
        req.dualApprovalThresholdConfigVersion = null;
        changed = true;
      }
      if (!('approvals' in req)) {
        req.approvals = [];
        changed = true;
      }
    }
    store.approvalMigrationVersion = 7;
    changed = true;
  }

  return changed;
}

export function jsonStoreEnabled(config) {
  return config.dataStore === 'json';
}

export function jsonStorePath(config) {
  return resolve(process.cwd(), config.jsonDbPath || DEFAULT_JSON_DB_PATH);
}

async function readJsonStoreUnlocked(config) {
  const filePath = jsonStorePath(config);

  try {
    const raw = await readFile(filePath, 'utf8');
    const store = normalizeStore(JSON.parse(raw));
    if (migrateStore(store)) await writeJsonStoreUnlocked(config, store);
    return store;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const initial = defaultStore();
    migrateStore(initial);
    await writeJsonStoreUnlocked(config, initial);
    return initial;
  }
}

async function writeJsonStoreUnlocked(config, data) {
  const filePath = jsonStorePath(config);
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(normalizeStore(data), null, 2)}\n`, 'utf8');
  await rename(tmpPath, filePath);
}

export async function updateJsonStore(config, updater) {
  const filePath = jsonStorePath(config);
  return enqueueJsonStore(filePath, async () => {
    const current = await readJsonStoreUnlocked(config);
    const result = await updater(current);
    await writeJsonStoreUnlocked(config, current);
    return result;
  });
}

export async function readJsonStore(config) {
  const filePath = jsonStorePath(config);
  return enqueueJsonStore(filePath, () => readJsonStoreUnlocked(config));
}

export async function writeJsonStore(config, data) {
  const filePath = jsonStorePath(config);
  return enqueueJsonStore(filePath, () => writeJsonStoreUnlocked(config, data));
}

export async function atomicCompositeWrite(config, operations) {
  const filePath = jsonStorePath(config);
  return enqueueJsonStore(filePath, async () => {
    const current = await readJsonStoreUnlocked(config);
    const snapshot = JSON.parse(JSON.stringify(current));
    try {
      for (const op of operations) {
        if (!Array.isArray(snapshot[op.collection])) snapshot[op.collection] = [];
        snapshot[op.collection].push(op.record);
      }
    } catch (error) {
      throw error;
    }
    Object.assign(current, snapshot);
    await writeJsonStoreUnlocked(config, current);
  });
}

export async function updatePayment(config, id, updater) {
  return updateJsonStore(config, (store) => {
    const idx = store.payments.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const result = updater(store.payments[idx], store);
    if (result) store.payments[idx] = result;
    return result;
  });
}

export async function updateMandate(config, id, updater) {
  return updateJsonStore(config, (store) => {
    const idx = store.mandates.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    const result = updater(store.mandates[idx], store);
    if (result) store.mandates[idx] = result;
    return result;
  });
}

export async function updateSipControlRequest(config, id, updater) {
  return updateJsonStore(config, (store) => {
    const idx = store.sipControlRequests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const result = updater(store.sipControlRequests[idx], store);
    if (result) store.sipControlRequests[idx] = result;
    return result;
  });
}

export async function insertJsonRecord(config, collection, record) {
  return updateJsonStore(config, (store) => {
    if (!Array.isArray(store[collection])) store[collection] = [];
    store[collection].push(record);
    return record;
  });
}

export async function findRecord(config, collection, predicate) {
  const store = await readJsonStore(config);
  const item = (store[collection] || []).find(predicate);
  return { item, store };
}

export async function updateJsonRecord(config, collection, predicate, updater) {
  return updateJsonStore(config, (store) => {
    if (!Array.isArray(store[collection])) return null;
    const idx = store[collection].findIndex(predicate);
    if (idx === -1) return null;
    const existing = store[collection][idx];
    const updated = typeof updater === 'function' ? updater(existing) : { ...existing, ...updater };
    store[collection][idx] = updated;
    return updated;
  });
}

export async function deleteJsonRecord(config, collection, predicate) {
  return updateJsonStore(config, (store) => {
    if (!Array.isArray(store[collection])) return null;
    const idx = store[collection].findIndex(predicate);
    if (idx === -1) return null;
    const [removed] = store[collection].splice(idx, 1);
    return removed;
  });
}

export async function jsonDatabaseStatus(config) {
  const startedAt = Date.now();

  try {
    const store = await readJsonStore(config);
    return {
      configured: true,
      ok: true,
      type: 'json',
      path: jsonStorePath(config),
      users: store.users.length,
      deviceSessions: store.deviceSessions.length,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      type: 'json',
      path: jsonStorePath(config),
      message: error.message,
      latencyMs: Date.now() - startedAt,
    };
  }
}
