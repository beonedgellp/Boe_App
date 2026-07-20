import type { RetryPaymentOptions, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import type { PaymentRow, TransactionRow, InvestmentPlanRow, FundRow } from '#types/models.js';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';

function verifyRazorpayCheckoutSignature(orderId: string, paymentId: string, signature: any, secret: any) {
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

function visibleTransactionType(type: any) {
  const value = String(type || '').toLowerCase();
  if (value === 'sip' || value === 'sip_installment' || value === 'installment') return 'sip';
  if (value === 'lumpsum' || value === 'one_time' || value === 'one-time') return 'lumpsum';
  return value;
}

function fundTrackingId(fund: any) {
  if (!fund?.id) return '';
  return fund.trackingId || fund.fundCode || `FP-${String(fund.id).replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function fundSnapshot(fund: any, fundId: string) {
  if (!fund) {
    return fundId ? { id: fundId, name: fundId, title: fundId, trackingId: fundId, fundCode: fundId } : null;
  }
  const trackingId = fundTrackingId(fund);
  const metadata = (fund.metadata as any) || {};
  return {
    id: fund.id,
    name: fund.name || fund.title || fund.id,
    title: fund.title || fund.name || fund.id,
    trackingId,
    fundCode: trackingId,
    status: fund.status || metadata.status || '',
    lifecycleStage: fund.lifecycleStage || '',
    riskLabel: metadata.riskLabel || '',
    minSip: fund.minSip ?? null,
    minLumpsum: fund.minLumpsum ?? null,
    totalPoolSize: metadata.totalPoolSize ?? null,
  };
}

function paymentTypeFrom(mode: any, type: any) {
  const value = String(mode || '').toLowerCase();
  if (value.includes('autopay') || value.includes('mandate')) return 'autopay';
  if (visibleTransactionType(type) === 'sip' && !value) return 'autopay';
  return 'manual';
}

async function buildPaymentResponse(payment: any, config: AppConfig) {
  const transaction = payment.transactionId
    ? await prisma.transaction.findFirst({ where: { id: payment.transactionId } })
    : null;

  let plan: any = null;
  if (transaction?.investmentPlanId) {
    plan = await prisma.investmentPlan.findFirst({ where: { id: transaction.investmentPlanId } });
  }

  const fundId = payment.fundId || payment.productId || transaction?.productId || plan?.productId || null;
  const fund = fundId ? await prisma.fund.findFirst({ where: { id: fundId } }) : null;
  const type = visibleTransactionType(transaction?.type || plan?.type);
  const mode = payment.mode || '';

  return {
    ...payment,
    orderId: plan?.id || payment.orderId || '',
    planId: plan?.id || null,
    fundId,
    fund: fundSnapshot(fund, fundId),
    fundName: fund?.name || fundId || '',
    type,
    paymentType: paymentTypeFrom(mode, type),
    transaction: transaction ? {
      id: transaction.id,
      type,
      rawType: transaction.type || '',
      status: transaction.status || '',
      amount: transaction.amount ?? null,
      date: transaction.requestedAt?.toISOString() || transaction.createdAt?.toISOString() || '',
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

export async function getPayment(config: AppConfig, actor: Actor, paymentId: string) {
  let payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.userId !== actor?.userId) throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');

  // Auto-confirm mock payments
  if (payment.provider === 'mock' && payment.status === 'created') {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'success',
          confirmedAt: payment!.confirmedAt || now,
          updatedAt: now,
        },
      });

      if (payment!.transactionId) {
        const transaction = await tx.transaction.findFirst({ where: { id: payment!.transactionId } });
        if (transaction) {
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'payment_confirmed',
              paymentConfirmedAt: transaction.paymentConfirmedAt || now,
              updatedAt: now,
            },
          });

          if (transaction.investmentPlanId) {
            await tx.investmentPlan.update({
              where: { id: transaction.investmentPlanId },
              data: {
                status: 'active',
                updatedAt: now,
              },
            });
          }
        }
      }
    });

    payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  }

  return buildPaymentResponse(payment, config);
}

export async function confirmRazorpayPayment(config: AppConfig, actor: Actor, paymentId: string, body: any) {
  const razorpayPaymentId = String(body?.razorpay_payment_id || '').trim();
  const razorpayOrderId = String(body?.razorpay_order_id || '').trim();
  const razorpaySignature = String(body?.razorpay_signature || '').trim();

  if (!verifyRazorpayCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, config.razorpayKeySecret)) {
    throw new HttpError(401, 'INVALID_RAZORPAY_SIGNATURE', 'Razorpay payment signature verification failed.');
  }

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');
  }
  if (payment.provider !== 'razorpay') {
    throw new HttpError(400, 'PAYMENT_PROVIDER_NOT_RAZORPAY', 'Only Razorpay payments can be confirmed with this endpoint.');
  }
  const expectedOrderId = payment.providerPaymentId;
  if (expectedOrderId !== razorpayOrderId) {
    throw new HttpError(400, 'RAZORPAY_ORDER_MISMATCH', 'Razorpay order id does not match this payment.');
  }

  const now = new Date();
  const beforePayment = { ...payment };

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        providerPaymentId: razorpayPaymentId,
        status: 'success',
        confirmedAt: payment.confirmedAt || now,
        updatedAt: now,
      },
    });

    if (payment.transactionId) {
      const transaction = await tx.transaction.findFirst({ where: { id: payment.transactionId } });
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'payment_confirmed',
            paymentConfirmedAt: transaction.paymentConfirmedAt || now,
            updatedAt: now,
          },
        });

        if (transaction.investmentPlanId) {
          await tx.investmentPlan.update({
            where: { id: transaction.investmentPlanId },
            data: {
              status: 'active',
              updatedAt: now,
            },
          });
        }
      }
    }

    await tx.adminAuditLog.create({
      data: {
        adminId: actor.userId || null,
        action: 'payment.razorpay_confirm',
        entityType: 'payment',
        entityId: paymentId,
        beforeJson: beforePayment as any,
        afterJson: { ...updated } as any,
        reason: 'Client confirmed Razorpay Checkout signature.',
        ipAddress: null,
        userAgent: null,
      },
    });

    return {
      ...updated,
      providerKeyId: config.razorpayKeyId || null,
    };
  });

  return result;
}

async function _retryPayment(config: AppConfig, actor: Actor, paymentId: string, options: RetryPaymentOptions = {}) {
  void options;

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Payment does not belong to you.');
  }

  const owner = await prisma.user.findFirst({ where: { id: payment.userId } });
  if (!owner || owner.status !== 'approved') {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to retry a payment.', {
      status: owner?.status || 'missing',
    });
  }

  if (payment.idempotencyKey) {
    const duplicate = await prisma.payment.findFirst({
      where: {
        idempotencyKey: payment.idempotencyKey,
        id: { not: payment.id },
      },
    });
    if (duplicate) {
      throw new HttpError(409, 'DUPLICATE_IDEMPOTENCY_KEY', 'Duplicate idempotency key detected.');
    }
  }

  if (payment.status === 'created') {
    return payment;
  }
  if (!['failed', 'expired'].includes(payment.status)) {
    throw new HttpError(400, 'PAYMENT_NOT_RETRYABLE', 'Only failed or expired payments can be retried.');
  }

  const now = new Date();
  const before = { ...payment };

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'created',
        failureReason: null,
        updatedAt: now,
      },
    });

    if (payment.transactionId) {
      const transaction = await tx.transaction.findFirst({ where: { id: payment.transactionId } });
      if (transaction) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'payment_pending',
            updatedAt: now,
          },
        });

        if (transaction.investmentPlanId) {
          const plan = await tx.investmentPlan.findFirst({ where: { id: transaction.investmentPlanId } });
          if (plan) {
            await tx.investmentPlan.update({
              where: { id: plan.id },
              data: {
                status: plan.type === 'sip' ? 'pending_first_payment' : 'pending_first_payment',
                updatedAt: now,
              },
            });
          }
        }
      }
    }

    await tx.adminAuditLog.create({
      data: {
        adminId: actor.userId || null,
        action: 'payment.retry',
        entityType: 'payment',
        entityId: paymentId,
        beforeJson: before as any,
        afterJson: { ...updated } as any,
        reason: 'Client requested retry.',
        ipAddress: null,
        userAgent: null,
      },
    });

    return updated;
  });

  return result;
}

export const retryPayment = withReceipt(_retryPayment, 'payment_retried', {
  entityType: 'payment',
  entityId: (result: any) => result.id,
  afterState: (result: any) => result.status,
  amount: (result: any) => result.amount ?? null,
  currency: (result: any) => result.currency ?? null,
  source: 'mock',
});
