import type { WebhookPayload } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from './withReceipt.js';
import { getPaymentProvider } from './payments/providerFactory.js';

const NOT_FOUND = Symbol('NOT_FOUND');
const WEBHOOK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function verifyHmacSignature(body: any, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const sig = String(signature || '').trim();
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function normalizeTimestamp(ts: any) {
  const n = Number(ts);
  if (!n || Number.isNaN(n)) return null;
  // Razorpay sends created_at in seconds; detect by magnitude (< 1e12 is seconds)
  return n < 1_000_000_000_000 ? n * 1000 : n;
}

async function _processPaymentWebhook(config: AppConfig, provider: any, rawBody: string, headers: any) {
  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  let payload: any;
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
  const failureReason = payload.failureReason ?? null;
  const timestamp = normalizeTimestamp((payload.timestamp || payload.created_at || Date.now()) as string | number);

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

  // Check for duplicate event (idempotency)
  const existingEvent = await prisma.paymentWebhookEvent.findFirst({
    where: { provider: String(provider), providerEventId: eventId },
  });
  if (existingEvent) {
    return {
      received: true,
      idempotent: true,
      paymentId: existingEvent.paymentId,
      newStatus: normalizedStatus,
    };
  }

  // Find the payment by provider reference
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: providerRef },
  });
  if (!payment) {
    throw new HttpError(404, 'PAYMENT_NOT_FOUND', `Payment with providerRef '${providerRef}' not found.`);
  }

  const nowDate = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Create webhook event record
    await tx.paymentWebhookEvent.create({
      data: {
        provider: String(provider),
        providerEventId: eventId,
        paymentId: payment.id,
        signatureValid: true,
        payloadJson: payload as any,
        processedAt: nowDate,
      },
    });

    // Update payment
    if (normalizedStatus === 'success') {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          confirmedAt: nowDate,
          updatedAt: nowDate,
        },
      });
    } else {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          failureReason: failureReason || 'Payment failed.',
          updatedAt: nowDate,
        },
      });
    }

    // Update linked transaction
    if (payment.transactionId) {
      const transaction = await tx.transaction.findFirst({ where: { id: payment.transactionId } });
      if (transaction) {
        if (normalizedStatus === 'success') {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'payment_confirmed',
              paymentConfirmedAt: nowDate,
              updatedAt: nowDate,
            },
          });
        } else {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'payment_failed',
              updatedAt: nowDate,
            },
          });
        }

        // Update linked investment plan
        if (transaction.investmentPlanId) {
          const plan = await tx.investmentPlan.findFirst({ where: { id: transaction.investmentPlanId } });
          if (plan) {
            if (normalizedStatus === 'success') {
              await tx.investmentPlan.update({
                where: { id: plan.id },
                data: { status: 'active', updatedAt: nowDate },
              });
            } else {
              const failedStatus = plan.status === 'pending_first_payment' ? 'first_payment_failed' : 'installment_failed';
              await tx.investmentPlan.update({
                where: { id: plan.id },
                data: { status: failedStatus as any, updatedAt: nowDate },
              });
            }
          }
        }
      }
    }

    // Audit log
    await tx.adminAuditLog.create({
      data: {
        adminId: null,
        action: 'webhook.payment.received',
        entityType: 'payment',
        entityId: payment.id,
        beforeJson: { status: payment.status } as any,
        afterJson: { status: normalizedStatus } as any,
        reason: `Payment webhook received: ${normalizedStatus}`,
        ipAddress: headers?.['x-forwarded-for'] || null,
        userAgent: headers?.['user-agent'] || null,
      },
    });

    return { paymentId: payment.id, newStatus: normalizedStatus };
  });

  return {
    received: true,
    paymentId: result.paymentId,
    newStatus: result.newStatus,
  };
}

export const processPaymentWebhook = withReceipt(_processPaymentWebhook, (result: any) => {
  return result.newStatus === 'success' ? 'payment_confirmed' : 'payment_failed';
}, {
  entityType: 'payment',
  entityId: (result: any) => result.paymentId,
  afterState: (result: any) => result.newStatus,
  subjectUserId: async (result: any, args: any) => {
    const payment = await prisma.payment.findFirst({ where: { id: result.paymentId } });
    return payment?.userId || 'system';
  },
  amount: async (result: any, args: any) => {
    const payment = await prisma.payment.findFirst({ where: { id: result.paymentId } });
    return payment?.amount ?? null;
  },
  currency: async (result: any, args: any) => {
    const payment = await prisma.payment.findFirst({ where: { id: result.paymentId } });
    return payment?.currency ?? null;
  },
  source: 'live',
});

export async function processMandateWebhook(config: AppConfig, provider: any, rawBody: string, headers: any) {
  const body = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
  let payload: any;
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
  const failureReason = payload.failureReason ?? null;
  const timestamp = normalizeTimestamp((payload.timestamp || payload.created_at || Date.now()) as string | number);

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

  // Check for duplicate event (idempotency)
  const existingEvent = await prisma.mandateWebhookEvent.findFirst({
    where: { provider: String(provider), providerEventId: eventId },
  });
  if (existingEvent) {
    return {
      received: true,
      idempotent: true,
      mandateId: existingEvent.mandateId,
      newStatus: normalizedStatus,
    };
  }

  // Find the mandate by provider reference
  const mandate = await prisma.mandate.findFirst({
    where: { providerMandateId: providerRef },
  });
  if (!mandate) {
    throw new HttpError(404, 'MANDATE_NOT_FOUND', `Mandate with providerRef '${providerRef}' not found.`);
  }

  const nowDate = new Date();
  const beforeMandate = { ...mandate };

  const result = await prisma.$transaction(async (tx) => {
    // Create webhook event record
    await tx.mandateWebhookEvent.create({
      data: {
        provider: String(provider),
        providerEventId: eventId,
        mandateId: mandate.id,
        signatureValid: true,
        payloadJson: payload as any,
        processedAt: nowDate,
      },
    });

    // Update mandate
    const updateData: any = {
      status: normalizedStatus as any,
      updatedAt: nowDate,
    };
    if (normalizedStatus === 'active') {
      updateData.validFrom = nowDate;
    }
    await tx.mandate.update({
      where: { id: mandate.id },
      data: updateData,
    });

    // Audit log
    await tx.adminAuditLog.create({
      data: {
        adminId: null,
        action: 'webhook.mandate.received',
        entityType: 'mandate',
        entityId: mandate.id,
        beforeJson: { status: mandate.status } as any,
        afterJson: { status: normalizedStatus } as any,
        reason: `Mandate webhook received: ${normalizedStatus}`,
        ipAddress: headers?.['x-forwarded-for'] || null,
        userAgent: headers?.['user-agent'] || null,
      },
    });

    return { mandateId: mandate.id, newStatus: normalizedStatus };
  });

  return {
    received: true,
    mandateId: result.mandateId,
    newStatus: result.newStatus,
  };
}
