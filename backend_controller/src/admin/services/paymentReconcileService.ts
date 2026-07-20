import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, updateJsonStore } from '#db/pgAdapter.js';
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

function clientIp(headers: any = {}) {
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

function findPaymentPlan(store: any, payment: any, transaction: any) {
  const plans = store.investmentPlans || store.orders || [];
  if (transaction?.investmentPlanId) {
    const byTransaction = plans.find((item: any) => item.id === transaction.investmentPlanId);
    if (byTransaction) return byTransaction;
  }
  if (payment.investmentPlanId) {
    const byPaymentPlanId = plans.find((item: any) => item.id === payment.investmentPlanId);
    if (byPaymentPlanId) return byPaymentPlanId;
  }
  if (payment.id) {
    const byPaymentId = plans.find((item: any) => item.paymentId === payment.id);
    if (byPaymentId) return byPaymentId;
  }
  return null;
}

function resolvePaymentFund(store: any, payment: any, transaction: any, plan: any) {
  const fundId = payment.fundId || payment.productId || transaction?.productId || plan?.productId || plan?.fundId || null;
  if (!fundId) {
    throw new HttpError(400, 'PAYMENT_FUND_NOT_FOUND', 'Payment is not linked to a fund pool.');
  }
  const fund = (store.funds || []).find((item: any) => item.id === fundId);
  if (!fund) {
    throw new HttpError(404, 'PAYMENT_FUND_NOT_FOUND', `Fund ${fundId} not found for this payment.`);
  }
  return { fundId, fund };
}

function updateInvestmentState(transaction: any, plan: any, now: any) {
  if (transaction) {
    transaction.status = 'awaiting_approval';
    transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
    transaction.updatedAt = now;
  }

  if (plan) {
    plan.status = 'pending_admin_approval';
    plan.updatedAt = now;
  }
}

function approveInvestmentState(transaction: any, plan: any, now: any) {
  if (transaction) {
    transaction.status = 'approved';
    transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
    transaction.allottedAt = transaction.allottedAt || now;
    transaction.updatedAt = now;
  }

  if (plan) {
    plan.status = 'active';
    plan.startDate = plan.startDate || now;
    plan.updatedAt = now;
  }
}

function portfolioKey(userId: string) {
  return `portfolio_${userId}`;
}

function postApprovedPaymentToPortfolio(store: any, { payment, transaction, plan, fund, fundId, amount, now }: any) {
  const userId = payment.userId || transaction?.userId || plan?.userId;
  if (!userId) return null;

  const key = portfolioKey(userId);
  const portfolio = store[key] || {
    invested: 0,
    currentValue: 0,
    allTimeGain: 0,
    allTimeGainPct: 0,
    todayChange: 0,
    xirrPct: 0,
    asOf: now,
    holdings: [],
  };

  if (!Array.isArray(portfolio.holdings)) portfolio.holdings = [];
  const holding = portfolio.holdings.find((item: any) => item.fundId === fundId);
  const nav = Number(transaction?.nav || fund?.nav || 1) || 1;
  const units = Number(transaction?.units || 0) || amount / nav;

  if (holding) {
    const beforeInvested = Number(holding.invested || 0);
    const beforeUnits = Number(holding.units || 0);
    holding.invested = beforeInvested + amount;
    holding.units = beforeUnits + units;
    holding.avgCost = holding.units > 0 ? holding.invested / holding.units : holding.avgCost || nav;
    holding.currentValue = Number(holding.currentValue || beforeInvested) + amount;
    holding.status = 'units_allotted';
    holding.asOf = now;
    holding.updatedAt = now;
  } else {
    portfolio.holdings.push({
      id: fundId,
      fundId,
      fundName: fund?.name || fund?.title || fundId,
      units,
      avgCost: nav,
      invested: amount,
      currentValue: amount,
      status: 'units_allotted',
      asOf: now,
      updatedAt: now,
      source: 'payment_approval',
    });
  }

  portfolio.invested = portfolio.holdings.reduce((sum: any, item: any) => sum + (Number(item.invested) || 0), 0);
  portfolio.currentValue = portfolio.holdings.reduce((sum: any, item: any) => sum + (Number(item.currentValue ?? item.invested) || 0), 0);
  portfolio.allTimeGain = portfolio.currentValue - portfolio.invested;
  portfolio.allTimeGainPct = portfolio.invested > 0 ? (portfolio.allTimeGain / portfolio.invested) * 100 : 0;
  portfolio.asOf = now;
  portfolio.source = 'payment_approval';
  store[key] = portfolio;
  return portfolio;
}

async function _reconcilePayment(config: AppConfig, actor: Actor, paymentId: string, body: any = {}, requestContext: any = {}) {
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
    let transactionBefore: any = beforeTransaction;
    if (transaction) {
      transactionBefore = { ...transaction };
    }

    const plan = transaction
      ? (store.investmentPlans || []).find((item) => item.id === transaction.investmentPlanId)
      : null;
    let planBefore: any = beforePlan;
    if (plan) {
      planBefore = { ...plan };
    }

    updateInvestmentState(transaction, plan, now);

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

export async function approvePayment(config: AppConfig, actor: Actor, paymentId: string, body: any = {}, requestContext: any = {}) {
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

    approveInvestmentState(transaction, plan, now);

    fund.totalPoolSize = Number(fund.totalPoolSize || 0) + amount;
    fund.updatedAt = now;
    const portfolio = postApprovedPaymentToPortfolio(store, {
      payment,
      transaction,
      plan,
      fund,
      fundId,
      amount,
      now,
    });

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
        portfolio,
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
      portfolio,
      capitalTransaction,
    };
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

export async function rejectPayment(config: AppConfig, actor: Actor, paymentId: string, body: any = {}, requestContext: any = {}) {
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

    const transaction = (store.transactions || []).find((item) => item.id === payment.transactionId);
    if (transaction) {
      transaction.status = 'approval_rejected';
      transaction.failureReason = reason;
      transaction.updatedAt = now;
    }

    const plan = findPaymentPlan(store, payment, transaction);
    if (plan) {
      plan.status = 'approval_rejected';
      plan.updatedAt = now;
    }

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.reject',
      entityType: 'payment',
      entityId: payment.id,
      before: { payment: beforePayment },
      after: {
        payment: { ...payment },
        transaction: transaction ? { ...transaction } : null,
        investmentPlan: plan ? { ...plan } : null,
      },
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
  entityId: (result: any) => result.payment.id,
  beforeState: (result: any) => result.ledgerEntry.previousStatus,
  afterState: (result: any) => result.payment.status,
  subjectUserId: (result: any) => result.payment.userId,
  amount: (result: any) => result.payment.amount ?? null,
  currency: (result: any) => result.payment.currency ?? null,
  source: 'derived',
});

export function paymentReconcileRequestContext(headers: any = {}) {
  return {
    ipAddress: clientIp(headers),
    userAgent: headers['user-agent'] || null,
  };
}

export async function listReconciliationLedger(config: AppConfig, { paymentId, limit = 50 }: any = {}) {
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
