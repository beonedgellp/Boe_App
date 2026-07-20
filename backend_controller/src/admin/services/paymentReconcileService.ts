import type { PaymentReconcileBody, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { PaymentRow, TransactionRow, InvestmentPlanRow, FundRow } from '#types/models.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';

const RECONCILABLE_PAYMENT_STATUSES = new Set([
  'created',
  'gateway_initiated',
  'pending',
  'success',
  'confirmed',
]);
const APPROVABLE_PAYMENT_STATUSES = new Set(['success', 'confirmed', 'reconciled']);
const REJECTABLE_PAYMENT_STATUSES = new Set([
  'created',
  'gateway_initiated',
  'pending',
  'success',
  'confirmed',
  'reconciled',
]);

function clientIp(headers: Record<string, string | string[] | undefined> = {}) {
  return String(headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() || null;
}

function requireReason(body: any) {
  const reason = String(body?.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, 'RECONCILE_REASON_REQUIRED', 'Reconciliation reason is required.');
  }
  return reason;
}

function requireDecisionReason(body: any, code: any, message: any) {
  const reason = String(body?.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, code, message);
  }
  return reason;
}

async function _reconcilePayment(config: AppConfig, actor: Actor, paymentId: string, body: PaymentReconcileBody = {}, requestContext: RequestContext = {}) {
  const reason = requireReason(body);
  const providerReference = String(body.providerReference || body.providerRef || '').trim() || null;
  const settlementReference = String(body.settlementReference || '').trim() || null;
  const now = new Date();

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');

  if (payment.status === 'reconciled') {
    throw new HttpError(409, 'PAYMENT_ALREADY_RECONCILED', 'Payment is already reconciled.');
  }

  if (!RECONCILABLE_PAYMENT_STATUSES.has(payment.status)) {
    throw new HttpError(400, 'PAYMENT_NOT_RECONCILABLE', 'Payment cannot be reconciled from its current state.', {
      status: payment.status,
    });
  }

  const beforePayment = { ...payment };

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'reconciled',
        reconciledAt: now,
        ...(providerReference ? { providerPaymentId: providerReference } : {}),
        updatedAt: now,
      },
    });

    let transaction: any = null;
    if (payment.transactionId) {
      transaction = await tx.transaction.findFirst({ where: { id: payment.transactionId } });
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'payment_confirmed',
            paymentConfirmedAt: transaction.paymentConfirmedAt || now,
            updatedAt: now,
          },
        });
      }
    }

    let plan: any = null;
    if (transaction?.investmentPlanId) {
      plan = await tx.investmentPlan.findFirst({ where: { id: transaction.investmentPlanId } });
      if (plan) {
        await tx.investmentPlan.update({
          where: { id: plan.id },
          data: {
            status: 'active',
            updatedAt: now,
          },
        });
      }
    }

    const ledgerEntry = {
      id: randomUUID(),
      paymentId: payment.id,
      userId: payment.userId,
      transactionId: payment.transactionId || null,
      investmentPlanId: transaction?.investmentPlanId || null,
      provider: payment.provider || null,
      providerPaymentId: payment.providerPaymentId || null,
      settlementReference,
      amount: payment.amount ?? null,
      currency: payment.currency || 'INR',
      previousStatus: beforePayment.status,
      reconciledStatus: updatedPayment.status,
      reason,
      reconciledBy: actor?.userId || null,
      createdAt: now.toISOString(),
    };

    await tx.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'payment.reconcile',
        entityType: 'payment',
        entityId: payment.id,
        beforeJson: {
          payment: beforePayment,
          transaction: transaction ? { ...transaction } : null,
          investmentPlan: plan ? { ...plan } : null,
        },
        afterJson: {
          payment: { ...updatedPayment },
          transaction: transaction ? { ...transaction } : null,
          investmentPlan: plan ? { ...plan } : null,
          reconciliationLedger: ledgerEntry,
        },
        reason,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
      },
    });

    return {
      payment: updatedPayment,
      ledgerEntry,
      transaction,
      investmentPlan: plan,
    };
  });

  return result;
}

export async function approvePayment(config: AppConfig, actor: Actor, paymentId: string, body: PaymentReconcileBody = {}, requestContext: RequestContext = {}) {
  const reason = requireDecisionReason(
    body,
    'APPROVAL_REASON_REQUIRED',
    'Approval reason is required.',
  );
  const providerReference = String(body.providerReference || body.providerRef || '').trim() || null;
  const settlementReference = String(body.settlementReference || '').trim() || null;
  const now = new Date();

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');

  if (payment.status === 'approved' || (payment as any).approvedAt || (payment as any).poolPostedAt) {
    throw new HttpError(409, 'PAYMENT_ALREADY_APPROVED', 'Payment is already approved.');
  }

  if (!APPROVABLE_PAYMENT_STATUSES.has(payment.status)) {
    throw new HttpError(400, 'PAYMENT_NOT_APPROVABLE', 'Payment cannot be approved from its current state.', {
      status: payment.status,
    });
  }

  const amount = Number(payment.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'INVALID_PAYMENT_AMOUNT', 'Payment amount must be greater than 0.');
  }

  const beforePayment = { ...payment };

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'success',
        confirmedAt: now,
        ...(providerReference ? { providerPaymentId: providerReference } : {}),
        updatedAt: now,
      },
    });

    let transaction: any = null;
    if (payment.transactionId) {
      transaction = await tx.transaction.findFirst({ where: { id: payment.transactionId } });
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'allotted',
            paymentConfirmedAt: transaction.paymentConfirmedAt || now,
            allottedAt: transaction.allottedAt || now,
            updatedAt: now,
          },
        });
      }
    }

    let plan: any = null;
    if (transaction?.investmentPlanId) {
      plan = await tx.investmentPlan.findFirst({ where: { id: transaction.investmentPlanId } });
      if (plan) {
        await tx.investmentPlan.update({
          where: { id: plan.id },
          data: {
            status: 'active',
            startDate: plan.startDate || now,
            updatedAt: now,
          },
        });
      }
    }

    await tx.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'payment.approve',
        entityType: 'payment',
        entityId: payment.id,
        beforeJson: { payment: beforePayment },
        afterJson: {
          payment: { ...updatedPayment },
          transaction: transaction ? { ...transaction } : null,
          investmentPlan: plan ? { ...plan } : null,
        },
        reason,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
      },
    });

    return {
      payment: updatedPayment,
      transaction,
      investmentPlan: plan,
    };
  });

  return result;
}

export async function rejectPayment(config: AppConfig, actor: Actor, paymentId: string, body: PaymentReconcileBody = {}, requestContext: RequestContext = {}) {
  const reason = requireDecisionReason(
    body,
    'REJECTION_REASON_REQUIRED',
    'Rejection reason is required.',
  );
  const now = new Date();

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');

  if (payment.status === 'failed' && (payment as any).rejectedAt) {
    throw new HttpError(409, 'PAYMENT_ALREADY_REJECTED', 'Payment is already rejected.');
  }

  if (payment.status === 'success' && (payment as any).confirmedAt) {
    throw new HttpError(409, 'PAYMENT_ALREADY_APPROVED', 'Approved payments cannot be rejected.');
  }

  if (!REJECTABLE_PAYMENT_STATUSES.has(payment.status)) {
    throw new HttpError(400, 'PAYMENT_NOT_REJECTABLE', 'Payment cannot be rejected from its current state.', {
      status: payment.status,
    });
  }

  const beforePayment = { ...payment };

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        failureReason: reason,
        updatedAt: now,
      },
    });

    let transaction: any = null;
    if (payment.transactionId) {
      transaction = await tx.transaction.findFirst({ where: { id: payment.transactionId } });
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'cancelled',
            cancelledAt: now,
            updatedAt: now,
          },
        });
      }
    }

    let plan: any = null;
    if (transaction?.investmentPlanId) {
      plan = await tx.investmentPlan.findFirst({ where: { id: transaction.investmentPlanId } });
      if (plan) {
        await tx.investmentPlan.update({
          where: { id: plan.id },
          data: {
            status: 'cancelled',
            cancelledAt: now,
            updatedAt: now,
          },
        });
      }
    }

    await tx.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'payment.reject',
        entityType: 'payment',
        entityId: payment.id,
        beforeJson: { payment: beforePayment },
        afterJson: {
          payment: { ...updatedPayment },
          transaction: transaction ? { ...transaction } : null,
          investmentPlan: plan ? { ...plan } : null,
        },
        reason,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
      },
    });

    return { payment: updatedPayment };
  });

  return result;
}

export const reconcilePayment = withReceipt(_reconcilePayment, 'payment_reconciled', {
  entityType: 'payment',
  entityId: (result: any) => result.payment.id,
  beforeState: (result: any) => result.ledgerEntry.previousStatus,
  afterState: (result: any) => result.payment.status,
  subjectUserId: (result: any) => result.payment.userId,
  amount: (result: any) => result.payment.amount ?? null,
  currency: (result: any) => result.payment.currency ?? null,
  source: 'derived',
});

export function paymentReconcileRequestContext(headers: Record<string, string | string[] | undefined> = {}) {
  return {
    ipAddress: clientIp(headers),
    userAgent: headers['user-agent'] || null,
  };
}

export async function listReconciliationLedger(config: AppConfig, { paymentId, limit = 50 }: { paymentId?: string; limit?: number } = {}) {
  const where: any = {};
  if (paymentId) where.entityId = paymentId;
  where.action = 'payment.reconcile';

  const items = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { items, count: items.length };
}
