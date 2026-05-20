import { randomUUID } from 'node:crypto';
import { HttpError } from '../../http/errors.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '../../db/jsonStore.js';
import { withReceipt } from '../../shared/services/withReceipt.js';

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

function clientIp(headers = {}) {
  return String(headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() || null;
}

function requireReason(body) {
  const reason = String(body?.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, 'RECONCILE_REASON_REQUIRED', 'Reconciliation reason is required.');
  }
  return reason;
}

function requireDecisionReason(body, code, message) {
  const reason = String(body?.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, code, message);
  }
  return reason;
}

function findPaymentPlan(store, payment, transaction) {
  const plans = store.investmentPlans || store.orders || [];
  if (transaction?.investmentPlanId) {
    const byTransaction = plans.find((item) => item.id === transaction.investmentPlanId);
    if (byTransaction) return byTransaction;
  }
  if (payment.investmentPlanId) {
    const byPaymentPlanId = plans.find((item) => item.id === payment.investmentPlanId);
    if (byPaymentPlanId) return byPaymentPlanId;
  }
  if (payment.id) {
    const byPaymentId = plans.find((item) => item.paymentId === payment.id);
    if (byPaymentId) return byPaymentId;
  }
  return null;
}

function resolvePaymentFund(store, payment, transaction, plan) {
  const fundId = payment.fundId || payment.productId || transaction?.productId || plan?.productId || plan?.fundId || null;
  if (!fundId) {
    throw new HttpError(400, 'PAYMENT_FUND_NOT_FOUND', 'Payment is not linked to a fund pool.');
  }
  const fund = (store.funds || []).find((item) => item.id === fundId);
  if (!fund) {
    throw new HttpError(404, 'PAYMENT_FUND_NOT_FOUND', `Fund ${fundId} not found for this payment.`);
  }
  return { fundId, fund };
}

function updateInvestmentState(transaction, plan, now) {
  if (transaction) {
    transaction.status = 'payment_confirmed';
    transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
    transaction.updatedAt = now;
  }

  if (plan) {
    if (plan.status === 'pending_first_payment' || plan.status === 'pending_payment') {
      plan.status = 'active';
      plan.startDate = plan.startDate || now;
    } else if (plan.status !== 'active') {
      plan.status = 'installment_success';
    }
    plan.updatedAt = now;
  }
}

async function _reconcilePayment(config, actor, paymentId, body = {}, requestContext = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payment reconciliation is not yet implemented.');
  }

  const reason = requireReason(body);
  const providerReference = String(body.providerReference || body.providerRef || '').trim() || null;
  const settlementReference = String(body.settlementReference || '').trim() || null;
  const now = new Date().toISOString();

  const result = await updateJsonStore(config, (store) => {
    const payment = (store.payments || []).find((item) => item.id === paymentId);
    if (!payment) return null;

    if (payment.status === 'reconciled') {
      throw new HttpError(409, 'PAYMENT_ALREADY_RECONCILED', 'Payment is already reconciled.');
    }

    if (!RECONCILABLE_PAYMENT_STATUSES.has(payment.status)) {
      throw new HttpError(400, 'PAYMENT_NOT_RECONCILABLE', 'Payment cannot be reconciled from its current state.', {
        status: payment.status,
      });
    }

    const beforePayment = { ...payment };
    const beforeTransaction = null;
    const beforePlan = null;

    payment.status = 'reconciled';
    payment.reconciledAt = now;
    payment.reconciledBy = actor?.userId || null;
    payment.reconciliationReason = reason;
    if (providerReference) payment.providerPaymentId = providerReference;
    if (settlementReference) payment.settlementReference = settlementReference;
    payment.updatedAt = now;

    const transaction = (store.transactions || []).find((item) => item.id === payment.transactionId);
    let transactionBefore = beforeTransaction;
    if (transaction) {
      transactionBefore = { ...transaction };
      transaction.status = 'payment_confirmed';
      transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
      transaction.updatedAt = now;
    }

    const plan = transaction
      ? (store.investmentPlans || []).find((item) => item.id === transaction.investmentPlanId)
      : null;
    let planBefore = beforePlan;
    if (plan) {
      planBefore = { ...plan };
      if (plan.status === 'pending_first_payment') {
        plan.status = 'active';
        plan.startDate = plan.startDate || now;
      } else if (plan.status !== 'active') {
        plan.status = 'installment_success';
      }
      plan.updatedAt = now;
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
      reconciledStatus: payment.status,
      reason,
      reconciledBy: actor?.userId || null,
      createdAt: now,
    };

    if (!Array.isArray(store.reconciliationLedger)) store.reconciliationLedger = [];
    store.reconciliationLedger.push(ledgerEntry);

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.reconcile',
      entityType: 'payment',
      entityId: payment.id,
      before: {
        payment: beforePayment,
        transaction: transactionBefore,
        investmentPlan: planBefore,
      },
      after: {
        payment: { ...payment },
        transaction: transaction ? { ...transaction } : null,
        investmentPlan: plan ? { ...plan } : null,
        reconciliationLedger: ledgerEntry,
      },
      reason,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return {
      payment: { ...payment },
      ledgerEntry,
      transaction: transaction ? { ...transaction } : null,
      investmentPlan: plan ? { ...plan } : null,
    };
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

export async function approvePayment(config, actor, paymentId, body = {}, requestContext = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payment approval is not yet implemented.');
  }

  const reason = requireDecisionReason(
    body,
    'APPROVAL_REASON_REQUIRED',
    'Approval reason is required.',
  );
  const providerReference = String(body.providerReference || body.providerRef || '').trim() || null;
  const settlementReference = String(body.settlementReference || '').trim() || null;
  const now = new Date().toISOString();

  const result = await updateJsonStore(config, (store) => {
    const payment = (store.payments || []).find((item) => item.id === paymentId);
    if (!payment) return null;

    if (payment.status === 'approved' || payment.approvedAt || payment.poolPostedAt) {
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

    const transaction = (store.transactions || []).find((item) => item.id === payment.transactionId) || null;
    const plan = findPaymentPlan(store, payment, transaction);
    const { fundId, fund } = resolvePaymentFund(store, payment, transaction, plan);
    const existingCapitalTransaction = (store.capitalTransactions || []).find((item) => (
      item.paymentId === payment.id && item.type === 'payment_approval'
    ));
    if (existingCapitalTransaction) {
      throw new HttpError(409, 'PAYMENT_POOL_ALREADY_POSTED', 'Payment has already been posted to the fund pool.');
    }

    const beforePayment = { ...payment };
    const beforeTransaction = transaction ? { ...transaction } : null;
    const beforePlan = plan ? { ...plan } : null;
    const beforeFund = { ...fund };

    payment.status = 'approved';
    payment.approvedAt = now;
    payment.approvedBy = actor?.userId || null;
    payment.approvalReason = reason;
    payment.poolPostedAt = now;
    payment.poolPostedAmount = amount;
    payment.poolPostedFundId = fundId;
    if (providerReference) payment.providerPaymentId = providerReference;
    if (settlementReference) payment.settlementReference = settlementReference;
    payment.updatedAt = now;

    updateInvestmentState(transaction, plan, now);

    fund.totalPoolSize = Number(fund.totalPoolSize || 0) + amount;
    fund.updatedAt = now;

    if (!Array.isArray(store.capitalTransactions)) store.capitalTransactions = [];
    const capitalTransaction = {
      id: randomUUID(),
      fundId,
      type: 'payment_approval',
      amount,
      source: 'payment',
      target: 'pool',
      reason,
      createdBy: actor?.userId || null,
      paymentId: payment.id,
      transactionId: payment.transactionId || null,
      userId: payment.userId || null,
      createdAt: now,
    };
    store.capitalTransactions.push(capitalTransaction);

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.approve',
      entityType: 'payment',
      entityId: payment.id,
      before: {
        payment: beforePayment,
        transaction: beforeTransaction,
        investmentPlan: beforePlan,
        fund: beforeFund,
      },
      after: {
        payment: { ...payment },
        transaction: transaction ? { ...transaction } : null,
        investmentPlan: plan ? { ...plan } : null,
        fund: { ...fund },
        capitalTransaction,
      },
      reason,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return {
      payment: { ...payment },
      transaction: transaction ? { ...transaction } : null,
      investmentPlan: plan ? { ...plan } : null,
      fund: { ...fund },
      capitalTransaction,
    };
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

export async function rejectPayment(config, actor, paymentId, body = {}, requestContext = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payment rejection is not yet implemented.');
  }

  const reason = requireDecisionReason(
    body,
    'REJECTION_REASON_REQUIRED',
    'Rejection reason is required.',
  );
  const now = new Date().toISOString();

  const result = await updateJsonStore(config, (store) => {
    const payment = (store.payments || []).find((item) => item.id === paymentId);
    if (!payment) return null;

    if (payment.status === 'rejected' || payment.rejectedAt) {
      throw new HttpError(409, 'PAYMENT_ALREADY_REJECTED', 'Payment is already rejected.');
    }

    if (payment.status === 'approved' || payment.poolPostedAt) {
      throw new HttpError(409, 'PAYMENT_ALREADY_APPROVED', 'Approved payments cannot be rejected.');
    }

    if (!REJECTABLE_PAYMENT_STATUSES.has(payment.status)) {
      throw new HttpError(400, 'PAYMENT_NOT_REJECTABLE', 'Payment cannot be rejected from its current state.', {
        status: payment.status,
      });
    }

    const beforePayment = { ...payment };

    payment.status = 'rejected';
    payment.rejectedAt = now;
    payment.rejectedBy = actor?.userId || null;
    payment.rejectionReason = reason;
    payment.updatedAt = now;

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.reject',
      entityType: 'payment',
      entityId: payment.id,
      before: { payment: beforePayment },
      after: { payment: { ...payment } },
      reason,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return { payment: { ...payment } };
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

export const reconcilePayment = withReceipt(_reconcilePayment, 'payment_reconciled', {
  entityType: 'payment',
  entityId: (result) => result.payment.id,
  beforeState: (result) => result.ledgerEntry.previousStatus,
  afterState: (result) => result.payment.status,
  subjectUserId: (result) => result.payment.userId,
  amount: (result) => result.payment.amount ?? null,
  currency: (result) => result.payment.currency ?? null,
  source: 'derived',
});

export function paymentReconcileRequestContext(headers = {}) {
  return {
    ipAddress: clientIp(headers),
    userAgent: headers['user-agent'] || null,
  };
}

export async function listReconciliationLedger(config, { paymentId, limit = 50 } = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for reconciliation ledger is not yet implemented.');
  }
  const store = await readJsonStore(config);
  let items = store.reconciliationLedger || [];
  if (paymentId) {
    items = items.filter((entry) => entry.paymentId === paymentId);
  }
  items = items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  return { items, count: items.length };
}
