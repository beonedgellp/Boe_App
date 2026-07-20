import type { OrderBody, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID, createHash } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';
import { getPaymentProvider } from '#shared/services/payments/providerFactory.js';

const CLIENT_VISIBLE_STAGES = new Set(['published', 'active', 'paused', 'closed']);

function toNumber(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hashDisclosureText(text: any) {
  if (!text) return null;
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function shortReceipt(prefix: any, id: string) {
  return `${prefix}_${String(id).replace(/-/g, '').slice(0, 32)}`;
}

/* ---------- getOrder ---------- */

export async function getOrder(config: AppConfig, actor: Actor, orderId: string) {
  const plan = await prisma.investmentPlan.findFirst({ where: { id: orderId } });
  let order = plan as any;

  if (!order) {
    const orderRecord = await prisma.order.findFirst({ where: { id: orderId } });
    order = orderRecord;
  }

  if (!order) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  if (order.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Order does not belong to you.');
  }

  return order;
}

/* ---------- createLumpsumOrder ---------- */

async function _createLumpsumOrder(config: AppConfig, actor: Actor, body: OrderBody, requestContext: RequestContext = {}) {
  if (!actor || actor.status !== 'approved') {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to create a lumpsum order.');
  }

  const payload = body && typeof body === 'object' ? body : {};
  const productId = String(payload.productId || payload.fundId || '').trim();
  const amount = toNumber(payload.amount, 0);

  if (!productId) {
    throw new HttpError(400, 'INVALID_PRODUCT', 'Product ID is required.');
  }

  const fund = await prisma.fund.findFirst({ where: { id: productId } });
  if (!fund) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found.`);
  }
  const fundMetadata = (fund.metadata as any) || {};
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) {
    throw new HttpError(400, 'PRODUCT_NOT_AVAILABLE', 'Product is not available for investment.');
  }

  // Idempotency: prevent duplicate lumpsum creation within 5 minutes for same user+fund+amount
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const existingPlan = await prisma.investmentPlan.findFirst({
    where: {
      userId: actor.userId,
      productId,
      type: 'one_time',
      amount,
      createdAt: { gt: fiveMinutesAgo },
    },
  });
  if (existingPlan) {
    return existingPlan;
  }

  const minLumpsum = toNumber(fund.minLumpsum, 5000) || 5000;
  if (amount < minLumpsum) {
    throw new HttpError(400, 'BELOW_MINIMUM_AMOUNT', `Minimum lumpsum amount is ₹${minLumpsum}.`);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const planId = randomUUID();
  const transactionId = randomUUID();
  const paymentId = randomUUID();

  const provider = getPaymentProvider(config);
  const order = await provider.createPaymentOrder({
    amount,
    currency: 'INR',
    receipt: shortReceipt('lumpsum', planId),
    notes: { planId, userId: actor.userId },
  });

  const idempotencyKey = requestContext.idempotencyKey
    ? `lumpsum_${actor.userId}_${requestContext.idempotencyKey}_payment`
    : `lumpsum_${planId}_payment`;

  // Check if payment with same idempotency key already exists
  const existingPayment = await prisma.payment.findFirst({
    where: { idempotencyKey },
  });
  if (existingPayment) {
    return {
      planId,
      paymentId: existingPayment.id,
      status: 'pending_payment',
      nextAction: 'complete_payment',
      providerOrderId: existingPayment.providerPaymentId || null,
      providerKeyId: config.razorpayKeyId || null,
      providerName: provider.name,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
    };
  }

  await prisma.$transaction([
    prisma.investmentPlan.create({
      data: {
        id: planId,
        userId: actor.userId,
        productId,
        type: 'one_time',
        amount,
        durationMonths: null,
        debitDay: null,
        status: 'pending_first_payment',
        mandateId: null,
        startDate: null,
        nextDueDate: null,
        completedAt: null,
        cancelledAt: null,
      },
    }),
    prisma.transaction.create({
      data: {
        id: transactionId,
        userId: actor.userId,
        productId,
        investmentPlanId: planId,
        type: 'one_time_investment',
        amount,
        nav: null,
        units: null,
        status: 'submitted',
        idempotencyKey: randomUUID(),
        requestedAt: now,
        paymentConfirmedAt: null,
        allottedAt: null,
        cancelledAt: null,
      },
    }),
    prisma.payment.create({
      data: {
        id: paymentId,
        userId: actor.userId,
        transactionId,
        provider: provider.name,
        providerPaymentId: order.id,
        amount,
        currency: 'INR',
        mode: 'upi',
        status: 'created',
        failureReason: null,
        idempotencyKey,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: actor.userId || null,
        action: 'lumpsum.create',
        entityType: 'investment_plan',
        entityId: planId,
        beforeJson: null,
        afterJson: { planId, productId, amount, type: 'one_time', status: 'pending_payment' } as any,
        reason: 'Client created lumpsum investment plan.',
        ipAddress: requestContext.ipAddress || null,
        userAgent: typeof requestContext.userAgent === 'string' ? requestContext.userAgent : null,
      },
    }),
  ]);

  return {
    planId,
    paymentId,
    status: 'pending_payment',
    nextAction: 'complete_payment',
    providerOrderId: order.id,
    providerKeyId: config.razorpayKeyId || null,
    providerName: provider.name,
    amount,
    currency: 'INR',
  };
}

export const createLumpsumOrder = withReceipt(_createLumpsumOrder, 'lumpsum_created', {
  entityType: 'investment_plan',
  entityId: (result: any) => result.planId,
  afterState: (result: any) => result.status,
  amount: (result: any, args: any) => {
    const body = args[2] || {};
    const n = Number(body.amount);
    return Number.isFinite(n) ? n : null;
  },
  currency: () => 'INR',
  source: 'mock',
});

/* ---------- payPendingInstallment ---------- */

async function _payPendingInstallment(config: AppConfig, actor: Actor, orderId: string, options: Record<string, unknown> = {}) {
  if (!actor || actor.status !== 'approved') {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to pay an installment.');
  }

  const plan = await prisma.investmentPlan.findFirst({ where: { id: orderId } });

  if (!plan) {
    throw new HttpError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  if (plan.userId !== actor?.userId) {
    throw new HttpError(403, 'FORBIDDEN', 'Order does not belong to you.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const nextDueStr = plan.nextDueDate ? plan.nextDueDate.toISOString().slice(0, 10) : null;
  const isDue = nextDueStr && nextDueStr <= today;
  const isPayableStatus = ['active', 'pending_installment', 'pending_first_payment'].includes(plan.status);

  if (!isPayableStatus && !isDue) {
    throw new HttpError(400, 'INSTALLMENT_NOT_DUE', 'No installment is currently due for this plan.');
  }

  const now = new Date();
  const paymentId = randomUUID();

  const provider = getPaymentProvider(config);
  const order = await provider.createPaymentOrder({
    amount: Number(plan.amount),
    currency: 'INR',
    receipt: shortReceipt('installment', plan.id),
    notes: { planId: plan.id, userId: actor.userId },
  });

  const idempotencyKey = options.idempotencyKey
    ? `installment_${plan.id}_${actor.userId}_${options.idempotencyKey}`
    : `installment_${plan.id}_${Date.now()}`;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        id: paymentId,
        userId: actor.userId,
        transactionId: null,
        provider: provider.name,
        providerPaymentId: order.id,
        amount: Number(plan.amount),
        currency: 'INR',
        mode: 'upi_autopay',
        status: 'created',
        failureReason: null,
        idempotencyKey: String(idempotencyKey),
      },
    }),
    prisma.investmentPlan.update({
      where: { id: plan.id },
      data: {
        status: 'installment_processing',
        updatedAt: now,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminId: actor.userId || null,
        action: 'installment.pay',
        entityType: 'investment_plan',
        entityId: plan.id,
        beforeJson: { status: plan.status } as any,
        afterJson: { status: 'installment_processing' } as any,
        reason: 'Client paid pending installment.',
        ipAddress: null,
        userAgent: null,
      },
    }),
  ]);

  return { paymentId, status: 'created' };
}

export const payPendingInstallment = withReceipt(_payPendingInstallment, 'installment_paid', {
  entityType: 'payment',
  entityId: (result: any) => result.paymentId,
  afterState: (result: any) => result.status,
  amount: (result: any, args: any) => {
    return undefined;
  },
  currency: () => 'INR',
  source: 'mock',
});
