import type { TimelineEventInput } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '#db/prisma.js';
import { isValidMoneyState } from '../contracts/moneyState.js';
import { getCopy, getLatestVersion } from './copyRegistry.js';

function displayName(user: any) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || undefined;
}

function buildUserMap(users: any[]) {
  const map = new Map();
  for (const user of users) {
    map.set(user.id, user);
  }
  return map;
}

function actorFor(userId: string, userMap: any, fallbackRole = 'client') {
  const user = userMap.get(userId);
  return {
    userId: userId || null,
    role: user?.role || fallbackRole,
    name: displayName(user),
  };
}


function makeEvent({ entity, kind, category, actor, entityType, description, source, timestamp, beforeState, afterState, metadata }: TimelineEventInput) {
  return {
    id: randomUUID(),
    timestamp: timestamp || entity.updatedAt || entity.createdAt || new Date().toISOString(),
    kind,
    category,
    actor,
    description,
    entityType,
    entityId: entity.id,
    beforeState: beforeState ?? null,
    afterState: afterState ?? entity.status ?? entity.state ?? null,
    metadata: metadata ?? {},
    source,
  };
}

function sanitizeMetadata(entity: any, keys: any) {
  const meta: Record<string, any> = {};
  for (const key of keys) {
    if (key in entity) meta[key] = entity[key];
  }
  return meta;
}

function receiptsToEvents(receipts: any[], userMap: any) {
  return receipts.map((r: any) =>
    makeEvent({
      entity: r,
      kind: 'receipt',
      category: 'money',
      actor: actorFor(r.subjectUserId || r.userId, userMap),
      entityType: 'receipt',
      description: r.description || `Receipt ${r.status || 'generated'}`,
      source: r.source || 'derived',
      metadata: sanitizeMetadata(r, ['amount', 'currency', 'status', 'createdAt']),
    }),
  );
}

function auditLogsToEvents(logs: any[], userMap: any) {
  return logs.map((log: any) =>
    makeEvent({
      entity: log,
      kind: 'audit',
      category: 'admin',
      actor: actorFor(log.adminId, userMap, 'admin'),
      entityType: log.entityType || 'unknown',
      description: `Admin action: ${log.action || 'unknown'}`,
      source: 'audit',
      timestamp: log.createdAt || new Date().toISOString(),
      beforeState: log.beforeJson?.status || null,
      afterState: log.afterJson?.status || null,
      metadata: sanitizeMetadata(log, ['action', 'reason', 'ipAddress', 'userAgent']),
    }),
  );
}


function investmentPlansToEvents(plans: any[], userMap: any) {
  return plans.map((p: any) =>
    makeEvent({
      entity: p,
      kind: 'state_change',
      category: 'money',
      actor: actorFor(p.userId, userMap),
      entityType: 'investment_plan',
      description: `Investment plan ${p.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(p, ['type', 'amount', 'durationMonths', 'debitDay', 'status', 'productId']),
    }),
  );
}

function paymentsToEvents(payments: any[], userMap: any) {
  return payments.map((p: any) =>
    makeEvent({
      entity: p,
      kind: 'state_change',
      category: 'money',
      actor: actorFor(p.userId, userMap),
      entityType: 'payment',
      description: `Payment ${p.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(p, ['amount', 'mode', 'provider', 'status', 'orderId']),
    }),
  );
}

function mandatesToEvents(mandates: any[], userMap: any) {
  return mandates.map((m: any) =>
    makeEvent({
      entity: m,
      kind: 'state_change',
      category: 'compliance',
      actor: actorFor(m.userId, userMap),
      entityType: 'mandate',
      description: `Mandate ${m.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(m, ['frequency', 'maxAmount', 'debitDay', 'status', 'provider']),
    }),
  );
}

function transactionsToEvents(transactions: any[], userMap: any) {
  return transactions.map((t: any) =>
    makeEvent({
      entity: t,
      kind: 'state_change',
      category: 'money',
      actor: actorFor(t.userId, userMap),
      entityType: 'transaction',
      description: `Transaction ${t.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(t, ['amount', 'type', 'status', 'orderId', 'productId']),
    }),
  );
}


function sipControlRequestsToEvents(requests: any[], userMap: any) {
  return requests.map((r: any) =>
    makeEvent({
      entity: r,
      kind: 'state_change',
      category: 'compliance',
      actor: actorFor(r.userId, userMap),
      entityType: 'sip_control_request',
      description: `SIP control request ${r.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(r, ['requestType', 'action', 'requestedValue', 'effectiveDate', 'status']),
    }),
  );
}

function redemptionRequestsToEvents(requests: any[], userMap: any) {
  return requests.map((r: any) =>
    makeEvent({
      entity: r,
      kind: 'state_change',
      category: 'money',
      actor: actorFor(r.userId, userMap),
      entityType: 'redemption_request',
      description: `Redemption request ${r.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(r, ['amount', 'fundId', 'status', 'reason']),
    }),
  );
}

function supportTicketsToEvents(tickets: any[], userMap: any) {
  return tickets.map((t: any) =>
    makeEvent({
      entity: t,
      kind: 'state_change',
      category: 'support',
      actor: actorFor(t.userId, userMap),
      entityType: 'support_ticket',
      description: `Support ticket ${t.status || 'updated'}`,
      source: 'derived',
      metadata: sanitizeMetadata(t, ['subject', 'category', 'status', 'assignedTo']),
    }),
  );
}


export async function buildTimelineForUser(config: AppConfig, userId: string, options: any = {}) {
  const [users, receipts, auditLogs, plans, payments, mandates, transactions, sipRequests, redemptions, tickets] = await Promise.all([
    prisma.user.findMany(),
    prisma.receipt.findMany({ where: { subjectUserId: userId } }),
    prisma.adminAuditLog.findMany(),
    prisma.investmentPlan.findMany({ where: { userId } }),
    prisma.payment.findMany({ where: { userId } }),
    prisma.mandate.findMany({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId } }),
    prisma.sipControlRequest.findMany({ where: { userId } }),
    prisma.redemptionRequest.findMany({ where: { userId } }),
    prisma.supportTicket.findMany({ where: { userId } }),
  ]);

  const userMap = buildUserMap(users);

  const userPaymentIds = new Set(payments.map((p) => p.id));
  const userMandateIds = new Set(mandates.map((m) => m.id));
  const userPlanIds = new Set(plans.map((p) => p.id));
  const userTxIds = new Set(transactions.map((t) => t.id));
  const userSipIds = new Set(sipRequests.map((r) => r.id));
  const userRedemptionIds = new Set(redemptions.map((r) => r.id));
  const userReceiptIds = new Set(receipts.map((r) => r.id));

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (log.entityType === 'users' && log.entityId === userId) return true;
    switch (log.entityType) {
      case 'payment': return userPaymentIds.has(log.entityId!);
      case 'mandate': return userMandateIds.has(log.entityId!);
      case 'investment_plan': return userPlanIds.has(log.entityId!);
      case 'transaction': return userTxIds.has(log.entityId!);
      case 'sip_control_request': return userSipIds.has(log.entityId!);
      case 'redemption_request': return userRedemptionIds.has(log.entityId!);
      case 'receipt': return userReceiptIds.has(log.entityId!);
      default: return false;
    }
  });

  const events = [
    ...receiptsToEvents(receipts, userMap),
    ...auditLogsToEvents(filteredAuditLogs, userMap),
    ...investmentPlansToEvents(plans, userMap),
    ...paymentsToEvents(payments, userMap),
    ...mandatesToEvents(mandates, userMap),
    ...transactionsToEvents(transactions, userMap),
    ...sipControlRequestsToEvents(sipRequests, userMap),
    ...redemptionRequestsToEvents(redemptions, userMap),
    ...supportTicketsToEvents(tickets, userMap),
  ];

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = events.length;
  const limit = Math.max(0, Math.min(options.limit ?? 50, 200));
  const offset = Math.max(0, options.offset ?? 0);
  const paginated = events.slice(offset, offset + limit);

  return { events: paginated, total };
}


export async function buildTimelineForEntity(config: AppConfig, entityType: any, entityId: any, options: any = {}) {
  const [users, receipts, auditLogs, plans, payments, mandates, transactions, sipRequests, redemptions, tickets] = await Promise.all([
    prisma.user.findMany(),
    prisma.receipt.findMany(),
    prisma.adminAuditLog.findMany(),
    prisma.investmentPlan.findMany(),
    prisma.payment.findMany(),
    prisma.mandate.findMany(),
    prisma.transaction.findMany(),
    prisma.sipControlRequest.findMany(),
    prisma.redemptionRequest.findMany(),
    prisma.supportTicket.findMany(),
  ]);

  const userMap = buildUserMap(users);

  const allEvents = [
    ...receiptsToEvents(receipts, userMap),
    ...auditLogsToEvents(auditLogs, userMap),
    ...investmentPlansToEvents(plans, userMap),
    ...paymentsToEvents(payments, userMap),
    ...mandatesToEvents(mandates, userMap),
    ...transactionsToEvents(transactions, userMap),
    ...sipControlRequestsToEvents(sipRequests, userMap),
    ...redemptionRequestsToEvents(redemptions, userMap),
    ...supportTicketsToEvents(tickets, userMap),
  ];

  const filtered = allEvents.filter((e) => e.entityType === entityType && e.entityId === entityId);
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = filtered.length;
  const limit = Math.max(0, Math.min(options.limit ?? 50, 200));
  const offset = Math.max(0, options.offset ?? 0);
  const paginated = filtered.slice(offset, offset + limit);

  return { events: paginated, total };
}


const STATUS_TO_MONEY_STATE = {
  payment: {
    created: 'pending_payment',
    gateway_initiated: 'pending_payment',
    pending: 'pending_payment',
    success: 'payment_received',
    reconciled: 'payment_received',
    refunded: 'redemption_paid',
    failed: 'failed_refund_pending',
    expired: 'failed_refund_pending',
  },
  mandate: {
    setup_required: 'mandate_pending',
    created: 'mandate_pending',
    pending_user_auth: 'mandate_pending',
    active: 'mandate_active',
    paused: 'mandate_active',
    failed: 'mandate_failed',
    revoked: 'mandate_failed',
    expired: 'mandate_failed',
  },
  investment_plan: {
    pending_first_payment: 'pending_payment',
    installment_due: 'pending_payment',
    installment_processing: 'payment_received',
    submitted: 'units_pending',
    active: 'units_allotted',
    installment_success: 'units_allotted',
    pending_mandate_setup: 'mandate_pending',
    mandate_pending_user_auth: 'mandate_pending',
    first_payment_failed: 'mandate_failed',
    installment_failed: 'failed_refund_pending',
    withdrawal_requested: 'redemption_requested',
    cancel_requested: 'redemption_requested',
    closed: 'redemption_paid',
    cancelled: 'redemption_paid',
  },
  redemption_request: {
    requested: 'redemption_requested',
    approved: 'redemption_requested',
    paid: 'redemption_paid',
    rejected: 'failed_refund_pending',
  },
};


async function deriveMoneyState(userId: string) {
  const candidates: { state: string; ts: string }[] = [];

  const payments = await prisma.payment.findMany({ where: { userId } });
  for (const p of payments) {
    const state = (STATUS_TO_MONEY_STATE.payment as Record<string, string>)[p.status];
    if (state) candidates.push({ state, ts: (p.updatedAt || p.createdAt).toISOString() });
  }

  const mandates = await prisma.mandate.findMany({ where: { userId } });
  for (const m of mandates) {
    const state = (STATUS_TO_MONEY_STATE.mandate as Record<string, string>)[m.status];
    if (state) candidates.push({ state, ts: (m.updatedAt || m.createdAt).toISOString() });
  }

  const plans = await prisma.investmentPlan.findMany({ where: { userId } });
  for (const p of plans) {
    const state = (STATUS_TO_MONEY_STATE.investment_plan as Record<string, string>)[p.status];
    if (state) candidates.push({ state, ts: (p.updatedAt || p.createdAt).toISOString() });
  }

  const redemptions = await prisma.redemptionRequest.findMany({ where: { userId } });
  for (const r of redemptions) {
    const state = (STATUS_TO_MONEY_STATE.redemption_request as Record<string, string>)[r.status];
    if (state) candidates.push({ state, ts: (r.updatedAt || r.createdAt).toISOString() });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return candidates[0].state;
}

export async function getNextStepText(config: AppConfig, userId: string, explicitState: string | null = null) {
  const version = getLatestVersion();
  if (explicitState && isValidMoneyState(explicitState)) {
    return getCopy(version, explicitState);
  }

  const derived = await deriveMoneyState(userId);
  return getCopy(version, derived || '');
}
