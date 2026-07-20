import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { validateReceipt } from '../contracts/receipt.js';

export async function emitReceipt(config: AppConfig, receiptData: any) {
  const now = new Date();

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
    asOfTimestamp: receiptData.asOfTimestamp || now.toISOString(),
    source: receiptData.source || 'derived',
    consentOrDisclosureSnapshotRef: receiptData.consentOrDisclosureSnapshotRef ?? null,
    taxRegimeVersion: receiptData.taxRegimeVersion ?? null,
    createdAt: now.toISOString(),
  };

  const errors = validateReceipt(receipt);
  if (errors.length > 0) {
    throw new HttpError(400, 'INVALID_RECEIPT', `Receipt validation failed: ${errors.join('; ')}`);
  }

  await prisma.receipt.create({
    data: {
      id: receipt.id,
      kind: receipt.kind,
      actor: receipt.actor as any,
      subjectUserId: receipt.subjectUserId,
      entityType: receipt.entityType,
      entityId: receipt.entityId,
      beforeState: receipt.beforeState as any,
      afterState: receipt.afterState as any,
      amount: receipt.amount,
      currency: receipt.currency,
      asOfTimestamp: receipt.asOfTimestamp ? new Date(receipt.asOfTimestamp) : null,
      source: receipt.source,
      consentOrDisclosureSnapshotRef: receipt.consentOrDisclosureSnapshotRef,
      taxRegimeVersion: receipt.taxRegimeVersion,
      createdAt: now,
    },
  });

  return receipt;
}


export async function getReceipts(config: AppConfig, filters: any = {}) {
  const where: any = {};

  if (filters.subjectUserId) {
    where.subjectUserId = filters.subjectUserId;
  }
  if (filters.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters.entityId) {
    where.entityId = filters.entityId;
  }
  if (filters.kind) {
    where.kind = filters.kind;
  }

  const receipts = await prisma.receipt.findMany({ where });
  return receipts;
}

export async function getReceipt(config: AppConfig, receiptId: any) {
  const receipt = await prisma.receipt.findFirst({ where: { id: receiptId } });
  return receipt || null;
}
