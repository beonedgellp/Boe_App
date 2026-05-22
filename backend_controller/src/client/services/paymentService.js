import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, findRecord, updateJsonStore, updatePayment } from '#db/jsonStore.js';
import { withReceipt } from '#shared/services/withReceipt.js';

function verifyRazorpayCheckoutSignature(orderId, paymentId, signature, secret) {
  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const received = String(signature || '').trim();
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function visibleTransactionType(type) {
  const value = String(type || '').toLowerCase();
  if (value === 'sip' || value === 'sip_installment' || value === 'installment') return 'sip';
  if (value === 'lumpsum' || value === 'one_time' || value === 'one-time') return 'lumpsum';
  return value;
}

function fundTrackingId(fund) {
  if (!fund?.id) return '';
  return fund.trackingId || fund.fundCode || `FP-${String(fund.id).replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function fundSnapshot(fund, fundId) {
  if (!fund) {
    return fundId ? { id: fundId, name: fundId, title: fundId, trackingId: fundId, fundCode: fundId } : null;
  }
  const trackingId = fundTrackingId(fund);
  return {
    id: fund.id,
    name: fund.name || fund.title || fund.id,
    title: fund.title || fund.name || fund.id,
    trackingId,
    fundCode: trackingId,
    status: fund.status || '',
    lifecycleStage: fund.lifecycleStage || '',
    riskLabel: fund.riskLabel || '',
    minSip: fund.minSip ?? null,
    minLumpsum: fund.minLumpsum ?? null,
    totalPoolSize: fund.totalPoolSize ?? null,
  };
}

function paymentTypeFrom(mode, type) {
  const value = String(mode || '').toLowerCase();
  if (value.includes('autopay') || value.includes('mandate')) return 'autopay';
  if (visibleTransactionType(type) === 'sip' && !value) return 'autopay';
  return 'manual';
}

function paymentResponse(payment, store, config) {
  const transaction = (store.transactions || []).find((item) => item.id === payment.transactionId) || null;
  const plans = store.investmentPlans || store.orders || [];
  const plan = transaction
    ? plans.find((item) => item.id === transaction.investmentPlanId)
    : plans.find((item) => item.paymentId === payment.id || item.id === payment.orderId) || null;
  const fundId = payment.fundId || payment.productId || transaction?.productId || plan?.productId || plan?.fundId || null;
  const fund = fundId ? (store.funds || []).find((item) => item.id === fundId) : null;
  const type = visibleTransactionType(transaction?.type || plan?.type);
  const mode = payment.mode || transaction?.mode || '';
  return {
    ...payment,
    orderId: plan?.id || payment.orderId || '',
    planId: plan?.id || null,
    fundId,
    fund: fundSnapshot(fund, fundId),
    fundName: fund?.name || fund?.title || fundId || '',
    type,
    paymentType: paymentTypeFrom(mode, type),
    transaction: transaction ? {
      id: transaction.id,
      type,
      rawType: transaction.type || '',
      status: transaction.status || '',
      amount: transaction.amount ?? null,
      date: transaction.date || transaction.createdAt || '',
    } : null,
    plan: plan ? {
      id: plan.id,
      type: visibleTransactionType(plan.type),
      status: plan.status || '',
      amount: plan.amount ?? null,
      durationMonths: plan.durationMonths ?? null,
      debitDay: plan.debitDay ?? null,
      mandateId: plan.mandateId || null,
    } : null,
    providerKeyId: payment.provider === 'razorpay' ? (config.razorpayKeyId || null) : null,
  };
}

export async function getPayment(config, actor, paymentId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payments is not yet implemented.');
  }
  let { item: payment, store } = await findRecord(config, 'payments', (p) => p.id === paymentId);
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');

  if (payment.provider === 'mock' && payment.status === 'created') {
    payment = await updatePayment(config, paymentId, (current, store) => {
      if (current.userId !== actor?.userId) {
        throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');
      }
      const now = new Date().toISOString();
      current.status = 'success';
      current.confirmedAt = current.confirmedAt || now;
      current.updatedAt = now;

      const transaction = (store.transactions || []).find((t) => t.id === current.transactionId);
      if (transaction) {
        transaction.status = 'awaiting_approval';
        transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
        transaction.updatedAt = now;
      }

      const plan = transaction
        ? (store.investmentPlans || []).find((p) => p.id === transaction.investmentPlanId)
        : (store.investmentPlans || []).find((p) => p.paymentId === current.id);
      if (plan) {
        plan.status = 'pending_admin_approval';
        plan.updatedAt = now;
      }

      return current;
    });
    ({ item: payment, store } = await findRecord(config, 'payments', (p) => p.id === paymentId));
  }

  return paymentResponse(payment, store, config);
}

export async function confirmRazorpayPayment(config, actor, paymentId, body) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payments is not yet implemented.');
  }

  const razorpayPaymentId = String(body?.razorpay_payment_id || '').trim();
  const razorpayOrderId = String(body?.razorpay_order_id || '').trim();
  const razorpaySignature = String(body?.razorpay_signature || '').trim();

  if (!verifyRazorpayCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, config.razorpayKeySecret)) {
    throw new HttpError(401, 'INVALID_RAZORPAY_SIGNATURE', 'Razorpay payment signature verification failed.');
  }

  const result = await updateJsonStore(config, (store) => {
    const payment = (store.payments || []).find((p) => p.id === paymentId);
    if (!payment) return null;
    if (payment.userId !== actor?.userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');
    }
    if (payment.provider !== 'razorpay') {
      throw new HttpError(400, 'PAYMENT_PROVIDER_NOT_RAZORPAY', 'Only Razorpay payments can be confirmed with this endpoint.');
    }
    const expectedOrderId = payment.providerOrderId || payment.providerPaymentId;
    if (expectedOrderId !== razorpayOrderId) {
      throw new HttpError(400, 'RAZORPAY_ORDER_MISMATCH', 'Razorpay order id does not match this payment.');
    }

    const now = new Date().toISOString();
    const beforePayment = { ...payment };
    payment.providerOrderId = razorpayOrderId;
    payment.providerPaymentId = razorpayPaymentId;
    payment.status = 'success';
    payment.confirmedAt = payment.confirmedAt || now;
    payment.updatedAt = now;

    const transaction = (store.transactions || []).find((t) => t.id === payment.transactionId);
    if (transaction) {
      transaction.status = 'awaiting_approval';
      transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
      transaction.updatedAt = now;
    }

    const plan = transaction
      ? (store.investmentPlans || []).find((p) => p.id === transaction.investmentPlanId)
      : null;
    if (plan) {
      plan.status = 'pending_admin_approval';
      plan.updatedAt = now;
    }

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.razorpay_confirm',
      entityType: 'payment',
      entityId: payment.id,
      before: beforePayment,
      after: { ...payment },
      reason: 'Client confirmed Razorpay Checkout signature.',
      ipAddress: null,
      userAgent: null,
      createdAt: now,
    });

    return {
      ...payment,
      providerKeyId: config.razorpayKeyId || null,
    };
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

async function _retryPayment(config, actor, paymentId, options = {}) {
  // options.idempotencyKey is the route-level Idempotency-Key, used by the
  // outer middleware in src/http/idempotency.js. Accepted here for forward
  // compatibility / call-site symmetry; the existing payment row's own
  // idempotencyKey field is unchanged so receipts/audit trail are stable.
  void options;
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payments is not yet implemented.');
  }

  const result = await updatePayment(config, paymentId, (payment, store) => {
    if (payment.userId !== actor?.userId) {
      throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');
    }
    const owner = (store.users || []).find((user) => user.id === payment.userId);
    if (!owner || owner.status !== 'approved') {
      throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to retry a payment.', {
        status: owner?.status || 'missing',
      });
    }
    const duplicate = store.payments.find(
      (p) => p.idempotencyKey === payment.idempotencyKey && p.id !== payment.id
    );
    if (duplicate) {
      throw new HttpError(409, 'DUPLICATE_IDEMPOTENCY_KEY', 'Duplicate idempotency key detected.');
    }
    if (payment.status === 'created') {
      return payment;
    }
    if (!['failed', 'expired'].includes(payment.status)) {
      throw new HttpError(400, 'PAYMENT_NOT_RETRYABLE', 'Only failed or expired payments can be retried.');
    }
    const now = new Date().toISOString();
    const before = { ...payment };
    payment.status = 'created';
    payment.attemptCount = (payment.attemptCount || 0) + 1;
    payment.lastFailureReason = null;
    payment.failureReason = null;
    payment.updatedAt = now;

    const transaction = (store.transactions || []).find((t) => t.id === payment.transactionId);
    if (transaction) {
      transaction.status = 'payment_pending';
      transaction.failureReason = null;
      transaction.updatedAt = now;
    }

    const plan = transaction
      ? (store.investmentPlans || []).find((p) => p.id === transaction.investmentPlanId)
      : (store.investmentPlans || []).find((p) => p.paymentId === payment.id);
    if (plan) {
      plan.status = plan.type === 'sip' ? 'pending_first_payment' : 'pending_payment';
      plan.updatedAt = now;
    }

    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.retry',
      entityType: 'payment',
      entityId: payment.id,
      before,
      after: {
        payment: { ...payment },
        transaction: transaction ? { ...transaction } : null,
        investmentPlan: plan ? { ...plan } : null,
      },
      reason: 'Client requested retry.',
      ipAddress: null,
      userAgent: null,
      createdAt: now,
    });
    return payment;
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

export const retryPayment = withReceipt(_retryPayment, 'payment_retried', {
  entityType: 'payment',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  amount: (result) => result.amount ?? null,
  currency: (result) => result.currency ?? null,
  source: 'mock',
});
