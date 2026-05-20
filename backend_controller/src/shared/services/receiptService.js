import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '#db/jsonStore.js';
import { validateReceipt } from '../contracts/receipt.js';

export async function emitReceipt(config, receiptData) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'Receipt persistence requires JSON store.');
  }

  const now = new Date().toISOString();

  const receipt = {
    id: randomUUID(),
    kind: receiptData.kind,
    actor: receiptData.actor && typeof receiptData.actor === 'object'
      ? { userId: String(receiptData.actor.userId), role: String(receiptData.actor.role) }
      : { userId: 'system', role: 'system' },
    subjectUserId: String(receiptData.subjectUserId || receiptData.actor?.userId || 'system'),
    entityType: receiptData.entityType,
    entityId: receiptData.entityId,
    beforeState: receiptData.beforeState ?? null,
    afterState: receiptData.afterState,
    amount: receiptData.amount ?? null,
    currency: receiptData.currency ?? null,
    asOfTimestamp: receiptData.asOfTimestamp || now,
    source: receiptData.source || 'derived',
    consentOrDisclosureSnapshotRef: receiptData.consentOrDisclosureSnapshotRef ?? null,
    taxRegimeVersion: receiptData.taxRegimeVersion ?? null,
    createdAt: now,
  };

  const errors = validateReceipt(receipt);
  if (errors.length > 0) {
    throw new HttpError(400, 'INVALID_RECEIPT', `Receipt validation failed: ${errors.join('; ')}`);
  }

  await updateJsonStore(config, (store) => {
    if (!Array.isArray(store.receipts)) store.receipts = [];
    store.receipts.push(receipt);
    return receipt;
  });

  return receipt;
}

export async function getReceipts(config, filters = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'Receipt query requires JSON store.');
  }

  const store = await readJsonStore(config);
  let receipts = Array.isArray(store.receipts) ? [...store.receipts] : [];

  if (filters.subjectUserId) {
    receipts = receipts.filter((r) => r.subjectUserId === filters.subjectUserId);
  }
  if (filters.entityType) {
    receipts = receipts.filter((r) => r.entityType === filters.entityType);
  }
  if (filters.entityId) {
    receipts = receipts.filter((r) => r.entityId === filters.entityId);
  }
  if (filters.kind) {
    receipts = receipts.filter((r) => r.kind === filters.kind);
  }

  return receipts;
}

export async function getReceipt(config, receiptId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'Receipt query requires JSON store.');
  }

  const store = await readJsonStore(config);
  const receipts = Array.isArray(store.receipts) ? store.receipts : [];
  return receipts.find((r) => r.id === receiptId) || null;
}
