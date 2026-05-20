import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, updateJsonStore, readJsonStore } from '#db/jsonStore.js';
import { withReceipt } from './withReceipt.js';
import { getPaymentProvider } from './payments/providerFactory.js';

const NOT_FOUND = Symbol('NOT_FOUND');
const WEBHOOK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function verifyHmacSignature(body, signature, secret) {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const sig = String(signature || '').trim();
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function normalizeTimestamp(ts) {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return null;
  // Razorpay sends created_at in seconds; detect by magnitude (< 1e12 is seconds)
  return n < 1_000_000_000_000 ? n * 1000 : n;
}

function checkReplay(eventId, timestamp, store) {
  if (!eventId) {
    throw new HttpError(400, 'MISSING_EVENT_ID', 'Provider event id is required.');
  }
  const eventTime = Number(timestamp);
  if (!eventTime || Number.isNaN(eventTime)) {
    throw new HttpError(400, 'MISSING_TIMESTAMP', 'Webhook timestamp is required.');
  }
  const now = Date.now();
  if (Math.abs(now - eventTime) > WEBHOOK_WINDOW_MS) {
    throw new HttpError(409, 'REPLAY_DETECTED', 'Webhook event is outside the acceptable time window.');
  }
  const existingEvent = (store.webhookEvents || []).find((e) => e.eventId === eventId);
  if (existingEvent) {
    return { duplicate: true, existingEvent };
  }
  return { duplicate: false };
}

async function _processPaymentWebhook(config, provider, rawBody, headers) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'JSON store is not enabled.');
  }

  // `rawBody` may be the exact UTF-8 bytes (preferred for HMAC) or an
  // already-parsed object. Use the string for signature verification and
  // a parsed object for payload field extraction.
  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  let payload;
  if (rawBody && typeof rawBody === 'object') {
    payload = rawBody;
  } else if (typeof rawBody === 'string' && rawBody.length) {
    try { payload = JSON.parse(rawBody); } catch { payload = {}; }
  } else {
    payload = {};
  }

  // Provider-specific verification
  if (provider === 'razorpay') {
    const signature = headers?.['x-razorpay-signature'] || '';
    if (!verifyHmacSignature(body, signature, config.razorpayWebhookSecret || config.razorpayKeySecret)) {
      throw new HttpError(401, 'INVALID_SIGNATURE', 'Razorpay webhook signature verification failed.');
    }
  } else if (provider !== 'mock') {
    throw new HttpError(400, 'UNSUPPORTED_PROVIDER', `Provider '${provider}' is not supported.`);
  }

  const eventId = String(payload.eventId || payload.id || '').trim();
  const providerRef = String(payload.providerRef || payload.payload?.payment?.entity?.id || '').trim();
  const status = String(payload.status || payload.event || '').trim();
  const failureReason = payload.failureReason || null;
  const timestamp = normalizeTimestamp(payload.timestamp || payload.created_at || Date.now());

  if (!providerRef) {
    throw new HttpError(400, 'MISSING_PROVIDER_REF', 'providerRef is required.');
  }

  // Normalize Razorpay event names to internal status
  let normalizedStatus = status;
  if (provider === 'razorpay') {
    if (status === 'payment.captured') normalizedStatus = 'success';
    else if (status === 'payment.failed') normalizedStatus = 'failed';
    else if (status === 'order.paid') normalizedStatus = 'success';
  }

  if (!normalizedStatus || !['success', 'failed'].includes(normalizedStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', "status must be 'success' or 'failed'.");
  }

  const result = await updateJsonStore(config, (store) => {
    // Replay protection + idempotency by event id
    const replayCheck = checkReplay(eventId || `${providerRef}_${normalizedStatus}`, timestamp, store);
    if (replayCheck.duplicate) {
      return {
        idempotent: true,
        paymentId: replayCheck.existingEvent.entityId,
        newStatus: normalizedStatus,
      };
    }

    const payment = (store.payments || []).find((p) => p.providerPaymentId === providerRef);
    if (!payment) {
      return NOT_FOUND;
    }

    const now = new Date().toISOString();
    const beforePayment = { ...payment };

    // Store raw webhook event with provider event id
    const event = {
      id: randomUUID(),
      eventId: eventId || randomUUID(),
      provider,
      providerRef,
      status: normalizedStatus,
      entityId: payment.id,
      payload: rawBody,
      timestamp: new Date(timestamp).toISOString(),
      processedAt: now,
      createdAt: now,
    };
    if (!Array.isArray(store.webhookEvents)) store.webhookEvents = [];
    store.webhookEvents.push(event);
    if (!Array.isArray(store.paymentWebhookEvents)) store.paymentWebhookEvents = [];
    store.paymentWebhookEvents.push(event);

    // Update payment
    payment.status = normalizedStatus;
    payment.updatedAt = now;
    if (normalizedStatus === 'success') {
      payment.confirmedAt = now;
    } else {
      payment.failureReason = failureReason || 'Payment failed.';
      payment.lastFailureReason = failureReason || 'Payment failed.';
      payment.attemptCount = (payment.attemptCount || 0) + 1;
    }

    // Update linked transaction
    const transaction = (store.transactions || []).find((t) => t.id === payment.transactionId);
    if (transaction) {
      if (normalizedStatus === 'success') {
        transaction.status = 'payment_confirmed';
        transaction.paymentConfirmedAt = now;
      } else {
        transaction.status = 'payment_failed';
      }
      transaction.updatedAt = now;
    }

    // Update linked investment plan
    const plan = transaction
      ? (store.investmentPlans || []).find((p) => p.id === transaction.investmentPlanId)
      : null;
    if (plan) {
      if (normalizedStatus === 'success') {
        if (plan.status === 'pending_first_payment') {
          plan.status = 'active';
          plan.startDate = now;
        } else {
          plan.status = 'installment_success';
        }
      } else {
        if (plan.status === 'pending_first_payment') {
          plan.status = 'first_payment_failed';
        } else {
          plan.status = 'installment_failed';
        }
      }
      plan.updatedAt = now;
    }

    // Audit log
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: null,
      action: 'webhook.payment.received',
      entityType: 'payment',
      entityId: payment.id,
      before: beforePayment,
      after: { ...payment },
      reason: `Payment webhook received: ${normalizedStatus}`,
      ipAddress: headers?.['x-forwarded-for'] || null,
      userAgent: headers?.['user-agent'] || null,
      createdAt: now,
    });

    return { paymentId: payment.id, newStatus: normalizedStatus };
  });

  if (result === NOT_FOUND) {
    throw new HttpError(404, 'PAYMENT_NOT_FOUND', `Payment with providerRef '${providerRef}' not found.`);
  }

  return {
    received: true,
    paymentId: result.paymentId,
    newStatus: result.newStatus,
    ...(result.idempotent ? { idempotent: true } : {}),
  };
}

export const processPaymentWebhook = withReceipt(_processPaymentWebhook, (result) => {
  return result.newStatus === 'success' ? 'payment_confirmed' : 'payment_failed';
}, {
  entityType: 'payment',
  entityId: (result) => result.paymentId,
  afterState: (result) => result.newStatus,
  subjectUserId: async (result, args) => {
    const store = await readJsonStore(args[0]);
    const payment = store.payments.find((p) => p.id === result.paymentId);
    return payment?.userId || 'system';
  },
  amount: async (result, args) => {
    const store = await readJsonStore(args[0]);
    const payment = store.payments.find((p) => p.id === result.paymentId);
    return payment?.amount ?? null;
  },
  currency: async (result, args) => {
    const store = await readJsonStore(args[0]);
    const payment = store.payments.find((p) => p.id === result.paymentId);
    return payment?.currency ?? null;
  },
  source: 'live',
});

export async function processMandateWebhook(config, provider, rawBody, headers) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'JSON store is not enabled.');
  }

  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  let payload;
  if (rawBody && typeof rawBody === 'object') {
    payload = rawBody;
  } else if (typeof rawBody === 'string' && rawBody.length) {
    try { payload = JSON.parse(rawBody); } catch { payload = {}; }
  } else {
    payload = {};
  }

  // Provider-specific verification
  if (provider === 'razorpay') {
    const signature = headers?.['x-razorpay-signature'] || '';
    if (!verifyHmacSignature(body, signature, config.razorpayWebhookSecret || config.razorpayKeySecret)) {
      throw new HttpError(401, 'INVALID_SIGNATURE', 'Razorpay webhook signature verification failed.');
    }
  } else if (provider !== 'mock') {
    throw new HttpError(400, 'UNSUPPORTED_PROVIDER', `Provider '${provider}' is not supported.`);
  }

  const eventId = String(payload.eventId || payload.id || '').trim();
  const providerRef = String(payload.providerRef || payload.payload?.token?.entity?.id || '').trim();
  const status = String(payload.status || payload.event || '').trim();
  const failureReason = payload.failureReason || null;
  const timestamp = normalizeTimestamp(payload.timestamp || payload.created_at || Date.now());

  if (!providerRef) {
    throw new HttpError(400, 'MISSING_PROVIDER_REF', 'providerRef is required.');
  }

  // Normalize Razorpay event names
  let normalizedStatus = status;
  if (provider === 'razorpay') {
    if (status === 'token.confirmed') normalizedStatus = 'active';
    else if (status === 'token.rejected') normalizedStatus = 'failed';
    else if (status === 'token.cancelled') normalizedStatus = 'revoked';
  }

  if (!normalizedStatus || !['active', 'failed', 'revoked', 'expired'].includes(normalizedStatus)) {
    throw new HttpError(400, 'INVALID_STATUS', "status must be 'active', 'failed', 'revoked' or 'expired'.");
  }

  const result = await updateJsonStore(config, (store) => {
    // Replay protection + idempotency by event id
    const replayCheck = checkReplay(eventId || `${providerRef}_${normalizedStatus}`, timestamp, store);
    if (replayCheck.duplicate) {
      return {
        idempotent: true,
        mandateId: replayCheck.existingEvent.entityId,
        newStatus: normalizedStatus,
      };
    }

    const mandate = (store.mandates || []).find((m) => m.providerMandateId === providerRef);
    if (!mandate) {
      return NOT_FOUND;
    }

    const now = new Date().toISOString();
    const beforeMandate = { ...mandate };

    // Store raw webhook event
    const event = {
      id: randomUUID(),
      eventId: eventId || randomUUID(),
      provider,
      providerRef,
      status: normalizedStatus,
      entityId: mandate.id,
      payload: rawBody,
      timestamp: new Date(timestamp).toISOString(),
      processedAt: now,
      createdAt: now,
    };
    if (!Array.isArray(store.webhookEvents)) store.webhookEvents = [];
    store.webhookEvents.push(event);
    if (!Array.isArray(store.mandateWebhookEvents)) store.mandateWebhookEvents = [];
    store.mandateWebhookEvents.push(event);

    // Update mandate
    mandate.status = normalizedStatus;
    mandate.updatedAt = now;
    if (normalizedStatus === 'active') {
      mandate.authorizedAt = now;
      mandate.validFrom = now;
    } else if (normalizedStatus === 'failed') {
      mandate.failureReason = failureReason || 'Mandate setup failed.';
    }

    // Audit log
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: null,
      action: 'webhook.mandate.received',
      entityType: 'mandate',
      entityId: mandate.id,
      before: beforeMandate,
      after: { ...mandate },
      reason: `Mandate webhook received: ${normalizedStatus}`,
      ipAddress: headers?.['x-forwarded-for'] || null,
      userAgent: headers?.['user-agent'] || null,
      createdAt: now,
    });

    return { mandateId: mandate.id, newStatus: normalizedStatus };
  });

  if (result === NOT_FOUND) {
    throw new HttpError(404, 'MANDATE_NOT_FOUND', `Mandate with providerRef '${providerRef}' not found.`);
  }

  return {
    received: true,
    mandateId: result.mandateId,
    newStatus: result.newStatus,
    ...(result.idempotent ? { idempotent: true } : {}),
  };
}
