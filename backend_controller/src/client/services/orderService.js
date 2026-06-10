import { randomUUID, createHash } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import {
  readJsonStore,
  atomicCompositeWrite,
  updateJsonStore,
} from '#db/pgAdapter.js';
import { withReceipt } from '#shared/services/withReceipt.js';
import { getPaymentProvider } from '#shared/services/payments/providerFactory.js';

const CLIENT_VISIBLE_STAGES = new Set(['published', 'active', 'paused', 'closed']);

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hashDisclosureText(text) {
  if (!text) return null;
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function shortReceipt(prefix, id) {
  return `${prefix}_${String(id).replace(/-/g, '').slice(0, 32)}`;
}

/* ---------- getOrder ---------- */

export async function getOrder(config, actor, orderId) {
  const store = await readJsonStore(config);
  const plan = (store.investmentPlans || []).find((o) => o.id === orderId)
    || (store.orders || []).find((o) => o.id === orderId);

  if (!plan) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  if (plan.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Order does not belong to you.');
  }

  return plan;
}

/* ---------- createLumpsumOrder ---------- */

async function _createLumpsumOrder(config, actor, body, requestContext = {}) {
  if (!actor || actor.status !== 'approved') {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to create a lumpsum order.');
  }

  const payload = body && typeof body === 'object' ? body : {};
  const productId = String(payload.productId || payload.fundId || '').trim();
  const amount = toNumber(payload.amount, 0);

  if (!productId) {
    throw new HttpError(400, 'INVALID_PRODUCT', 'Product ID is required.');
  }

  const store = await readJsonStore(config);
  const fund = (store.funds || []).find((f) => f.id === productId);
  if (!fund) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found.`);
  }
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) {
    throw new HttpError(400, 'PRODUCT_NOT_AVAILABLE', 'Product is not available for investment.');
  }

  // Idempotency: prevent duplicate lumpsum creation within 5 minutes for same user+fund+amount
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const existingPlan = (store.investmentPlans || []).find((p) =>
    p.userId === actor.userId &&
    p.productId === productId &&
    p.type === 'one_time' &&
    p.amount === amount &&
    new Date(p.createdAt).getTime() > fiveMinutesAgo
  );
  if (existingPlan) {
    return existingPlan;
  }

  const minLumpsum = toNumber(fund.minLumpsum, 5000) || 5000;
  if (amount < minLumpsum) {
    throw new HttpError(400, 'BELOW_MINIMUM_AMOUNT', `Minimum lumpsum amount is ₹${minLumpsum}.`);
  }

  const now = new Date().toISOString();
  const planId = randomUUID();
  const transactionId = randomUUID();
  const paymentId = randomUUID();

  const plan = {
    id: planId,
    userId: actor.userId,
    productId,
    type: 'one_time',
    amount,
    durationMonths: null,
    debitDay: null,
    status: 'submitted',
    transactionId,
    paymentId,
    mandateId: null,
    consentTextVersion: payload.consentTextVersion || null,
    consentedAt: payload.consentedAt || null,
    disclosureVersionSnapshot: fund.disclosureVersion || null,
    disclosureTextSnapshot: fund.disclosureText || null,
    disclosureTextHash: hashDisclosureText(fund.disclosureText),
    startDate: null,
    nextDueDate: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const transaction = {
    id: transactionId,
    userId: actor.userId,
    productId,
    investmentPlanId: planId,
    type: 'lumpsum',
    amount,
    date: now,
    nav: null,
    units: null,
    status: 'submitted',
    idempotencyKey: randomUUID(),
    requestedAt: now,
    paymentConfirmedAt: null,
    allottedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const provider = getPaymentProvider(config);
  const order = await provider.createPaymentOrder({
    amount,
    currency: 'INR',
    receipt: shortReceipt('lumpsum', planId),
    notes: { planId, userId: actor.userId },
  });

  const payment = {
    id: paymentId,
    userId: actor.userId,
    transactionId,
    provider: provider.name,
    providerOrderId: order.id,
    providerPaymentId: order.id,
    amount,
    currency: 'INR',
    mode: 'upi',
    status: 'created',
    failureReason: null,
    lastFailureReason: null,
    attemptCount: 0,
    idempotencyKey: requestContext.idempotencyKey
      ? `lumpsum_${actor.userId}_${requestContext.idempotencyKey}_payment`
      : `lumpsum_${planId}_payment`,
    createdAt: now,
    confirmedAt: null,
    reconciledAt: null,
    updatedAt: now,
  };

  plan.status = 'pending_payment';
  plan.updatedAt = now;

  const existingPayment = store.payments.find((p) => p.idempotencyKey === payment.idempotencyKey);
  if (existingPayment) {
    return {
      planId,
      paymentId: existingPayment.id,
      status: plan.status,
      nextAction: 'complete_payment',
      providerOrderId: existingPayment.providerPaymentId || null,
      providerKeyId: config.razorpayKeyId || null,
      providerName: provider.name,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
    };
  }

  const auditLog = {
    id: randomUUID(),
    adminId: actor?.userId || null,
    action: 'lumpsum.create',
    entityType: 'investment_plan',
    entityId: planId,
    before: null,
    after: plan,
    reason: 'Client created lumpsum investment plan.',
    ipAddress: requestContext.ipAddress || null,
    userAgent: requestContext.userAgent || null,
    createdAt: now,
  };

  await atomicCompositeWrite(config, [
    { collection: 'investmentPlans', record: plan },
    { collection: 'transactions', record: transaction },
    { collection: 'payments', record: payment },
    { collection: 'adminAuditLogs', record: auditLog },
  ]);

  return {
    planId,
    paymentId,
    status: plan.status,
    nextAction: 'complete_payment',
    providerOrderId: order.id,
    providerKeyId: config.razorpayKeyId || null,
    providerName: provider.name,
    amount: payment.amount,
    currency: payment.currency,
  };
}

export const createLumpsumOrder = withReceipt(_createLumpsumOrder, 'lumpsum_created', {
  entityType: 'investment_plan',
  entityId: (result) => result.planId,
  afterState: (result) => result.status,
  amount: (result, args) => {
    const body = args[2] || {};
    const n = Number(body.amount);
    return Number.isFinite(n) ? n : null;
  },
  currency: () => 'INR',
  source: 'mock',
});

/* ---------- payPendingInstallment ---------- */

async function _payPendingInstallment(config, actor, orderId, options = {}) {
  if (!actor || actor.status !== 'approved') {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to pay an installment.');
  }

  const store = await readJsonStore(config);
  const plan = (store.investmentPlans || []).find((o) => o.id === orderId);

  if (!plan) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  if (plan.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Order does not belong to you.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const isDue = plan.nextDueDate && plan.nextDueDate <= today;
  const isPayableStatus = ['active', 'pending_installment', 'pending_first_payment'].includes(plan.status);

  if (!isPayableStatus && !isDue) {
    throw new HttpError(400, 'INSTALLMENT_NOT_DUE', 'No installment is currently due for this plan.');
  }

  const now = new Date().toISOString();
  const paymentId = randomUUID();

  const provider = getPaymentProvider(config);
  const order = await provider.createPaymentOrder({
    amount: plan.amount,
    currency: 'INR',
    receipt: shortReceipt('installment', plan.id),
    notes: { planId: plan.id, userId: actor.userId },
  });

  const payment = {
    id: paymentId,
    userId: actor.userId,
    transactionId: plan.transactionId || null,
    provider: provider.name,
    providerPaymentId: order.id,
    amount: plan.amount,
    currency: 'INR',
    mode: 'upi_autopay',
    status: 'created',
    failureReason: null,
    lastFailureReason: null,
    attemptCount: 0,
    idempotencyKey: options.idempotencyKey
      ? `installment_${plan.id}_${actor.userId}_${options.idempotencyKey}`
      : `installment_${plan.id}_${Date.now()}`,
    createdAt: now,
    confirmedAt: null,
    reconciledAt: null,
    updatedAt: now,
  };

  const auditLog = {
    id: randomUUID(),
    adminId: actor?.userId || null,
    action: 'installment.pay',
    entityType: 'investment_plan',
    entityId: plan.id,
    before: { status: plan.status },
    after: { status: 'installment_processing' },
    reason: 'Client paid pending installment.',
    ipAddress: null,
    userAgent: null,
    createdAt: now,
  };

  await updateJsonStore(config, (s) => {
    if (!Array.isArray(s.payments)) s.payments = [];
    if (!Array.isArray(s.adminAuditLogs)) s.adminAuditLogs = [];
    if (!Array.isArray(s.investmentPlans)) s.investmentPlans = [];

    s.payments.push(payment);
    s.adminAuditLogs.push(auditLog);

    const idx = s.investmentPlans.findIndex((p) => p.id === plan.id);
    if (idx !== -1) {
      s.investmentPlans[idx].status = 'installment_processing';
      s.investmentPlans[idx].updatedAt = now;
    }
    return { paymentId, status: 'created' };
  });

  return { paymentId, status: 'created' };
}

export const payPendingInstallment = withReceipt(_payPendingInstallment, 'installment_paid', {
  entityType: 'payment',
  entityId: (result) => result.paymentId,
  afterState: (result) => result.status,
  amount: (result, args) => {
    const config = args[0];
    // We don't have easy access to the plan amount here without re-reading;
    // withReceipt will default to null for amount if undefined.
    return undefined;
  },
  currency: () => 'INR',
  source: 'mock',
});
