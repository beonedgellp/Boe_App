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

export async function getPayment(config, actor, paymentId) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for payments is not yet implemented.');
  }
  const { item: payment } = await findRecord(config, 'payments', (p) => p.id === paymentId);
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');
  return {
    ...payment,
    providerKeyId: payment.provider === 'razorpay' ? (config.razorpayKeyId || null) : null,
  };
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
      transaction.status = 'payment_confirmed';
      transaction.paymentConfirmedAt = transaction.paymentConfirmedAt || now;
      transaction.updatedAt = now;
    }

    const plan = transaction
      ? (store.investmentPlans || []).find((p) => p.id === transaction.investmentPlanId)
      : null;
    if (plan) {
      if (plan.status === 'pending_first_payment') {
        plan.status = 'active';
        plan.startDate = plan.startDate || now;
      } else if (plan.status === 'pending_payment') {
        plan.status = 'active';
        plan.startDate = plan.startDate || now;
      }
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
    const owner = store.users.find((user) => user.id === payment.userId);
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
    if (payment.status !== 'failed') {
      throw new HttpError(400, 'PAYMENT_NOT_RETRYABLE', 'Only failed payments can be retried.');
    }
    const now = new Date().toISOString();
    const before = { ...payment };
    payment.status = 'created';
    payment.attemptCount = (payment.attemptCount || 0) + 1;
    payment.lastFailureReason = null;
    payment.updatedAt = now;
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.retry',
      entityType: 'payment',
      entityId: payment.id,
      before,
      after: { ...payment },
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
