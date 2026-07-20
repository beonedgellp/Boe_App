import type { SipBody, RequestContext } from '#types/services.js';
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

async function _createSip(config: AppConfig, actor: Actor, body: SipBody, requestContext: RequestContext = {}) {
  if (!actor || actor.status !== 'approved') {
    throw new HttpError(403, 'USER_NOT_APPROVED', 'User must be approved to create a SIP.');
  }

  const payload = body && typeof body === 'object' ? body : {};
  const productId = String(payload.productId || payload.fundId || '').trim();
  const amount = toNumber(payload.amount, 0);
  const durationMonths = toNumber(payload.durationMonths, 0);
  const debitDay = toNumber(payload.debitDay, 0);
  const consentTextVersion = payload.consentTextVersion || null;
  const consentedAt = payload.consentedAt || null;

  if (!productId) {
    throw new HttpError(400, 'INVALID_PRODUCT', 'Product ID is required.');
  }

  const fund = await prisma.fund.findFirst({ where: { id: productId } });
  if (!fund) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found.`);
  }
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) {
    throw new HttpError(400, 'PRODUCT_NOT_AVAILABLE', 'Product is not available for investment.');
  }

  // Idempotency: prevent duplicate SIP creation within 5 minutes for same user+fund+amount
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const existingPlan = await prisma.investmentPlan.findFirst({
    where: {
      userId: actor.userId,
      productId,
      type: 'sip',
      amount,
      createdAt: { gte: fiveMinutesAgo },
    },
  });

  if (existingPlan) {
    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId: existingPlan.id },
    });
    const existingMandate = existingPlan.mandateId
      ? await prisma.mandate.findFirst({ where: { id: existingPlan.mandateId } })
      : null;
    return {
      planId: existingPlan.id,
      paymentId: existingPayment?.id || null,
      mandateId: existingPlan.mandateId,
      status: existingPlan.status,
      nextAction: 'complete_payment',
      paymentUrl: `/app/payment/${existingPayment?.id || ''}`,
      providerOrderId: existingPayment?.providerPaymentId || null,
      providerKeyId: config.razorpayKeyId || null,
      providerName: existingPayment?.provider || getPaymentProvider(config).name,
      amount: existingPayment?.amount || existingPlan.amount,
      currency: existingPayment?.currency || 'INR',
    };
  }

  const minSipAmount = toNumber(fund.minSip, 500) || 500;
  const minDuration = toNumber((fund.metadata as any)?.minDurationMonths, 12) || 12;

  if (amount < minSipAmount) {
    throw new HttpError(400, 'BELOW_MINIMUM_AMOUNT', `Minimum SIP amount is ₹${minSipAmount}.`);
  }
  if (durationMonths < minDuration) {
    throw new HttpError(400, 'BELOW_MINIMUM_DURATION', `Minimum duration is ${minDuration} months.`);
  }
  if (debitDay < 1 || debitDay > 28) {
    throw new HttpError(400, 'INVALID_DEBIT_DAY', 'Debit day must be between 1 and 28.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const planId = randomUUID();
  const transactionId = randomUUID();
  const paymentId = randomUUID();
  const mandateId = randomUUID();

  const provider = getPaymentProvider(config);
  const order = await provider.createPaymentOrder({
    amount,
    currency: 'INR',
    receipt: shortReceipt('sip', planId),
    notes: { planId, userId: actor.userId },
  });
  const mandateToken = provider.name === 'razorpay'
    ? { id: null, status: 'pending_user_auth' }
    : await provider.createMandate({
        amount,
        frequency: 'monthly',
        customerId: actor.userId,
        notes: { planId, userId: actor.userId },
      });

  const idempotencyKeyPayment = requestContext.idempotencyKey
    ? `sip_${actor.userId}_${requestContext.idempotencyKey}_payment`
    : `sip_${planId}_payment`;

  // Check idempotency on payment
  const existingPaymentByKey = await prisma.payment.findFirst({
    where: { idempotencyKey: idempotencyKeyPayment },
  });
  if (existingPaymentByKey) {
    const existingPlanByPayment = await prisma.investmentPlan.findFirst({
      where: { mandateId: { not: undefined } },
    });
    return {
      planId: existingPlanByPayment?.id || null,
      paymentId: existingPaymentByKey.id,
      mandateId: existingPlanByPayment?.mandateId || null,
      status: existingPlanByPayment?.status || 'pending_first_payment',
      nextAction: 'complete_payment',
      paymentUrl: `/app/payment/${existingPaymentByKey.id}`,
      providerOrderId: existingPaymentByKey.providerPaymentId || null,
      providerKeyId: config.razorpayKeyId || null,
      providerName: existingPaymentByKey.provider || provider.name,
      amount: existingPaymentByKey.amount,
      currency: existingPaymentByKey.currency,
    };
  }

  const mandateStatus = mandateToken.status === 'pending_user_auth' ? 'pending_user_auth' : 'setup_required';

  // Atomic write: investmentPlan + transaction + payment + mandate + auditLog
  await prisma.$transaction([
    prisma.investmentPlan.create({
      data: {
        id: planId,
        userId: actor.userId,
        productId,
        type: 'sip',
        amount,
        durationMonths,
        debitDay,
        status: 'pending_first_payment',
        mandateId,
        startDate: null,
        nextDueDate: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.transaction.create({
      data: {
        id: transactionId,
        userId: actor.userId,
        productId,
        investmentPlanId: planId,
        type: 'sip_installment',
        amount,
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
        mode: 'upi_autopay',
        status: 'created',
        failureReason: null,
        idempotencyKey: idempotencyKeyPayment,
        createdAt: now,
        confirmedAt: null,
        reconciledAt: null,
        updatedAt: now,
      },
    }),
    prisma.mandate.create({
      data: {
        id: mandateId,
        userId: actor.userId,
        investmentPlanId: planId,
        provider: provider.name,
        providerMandateId: mandateToken.id || null,
        maxAmount: amount,
        frequency: 'monthly',
        debitDay,
        status: mandateStatus as any,
        idempotencyKey: randomUUID(),
        validFrom: null,
        validTo: null,
        lastDebitAt: null,
        nextDebitAt: null,
        createdAt: now,
        updatedAt: now,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'sip.create',
        entityType: 'investment_plan',
        entityId: planId,
        beforeJson: null,
        afterJson: { planId, status: 'pending_first_payment', amount, productId } as any,
        reason: 'Client created SIP investment plan.',
        ipAddress: (requestContext as any).ipAddress || null,
        userAgent: (requestContext as any).userAgent || null,
        createdAt: now,
      },
    }),
  ]);

  return {
    planId,
    paymentId,
    mandateId,
    status: 'pending_first_payment',
    nextAction: 'complete_payment',
    paymentUrl: `/app/payment/${paymentId}`,
    providerOrderId: order.id,
    providerKeyId: config.razorpayKeyId || null,
    providerName: provider.name,
    amount,
    currency: 'INR',
  };
}

export const createSip = withReceipt(_createSip, 'sip_created', {
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
