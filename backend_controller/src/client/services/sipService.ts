import { randomUUID, createHash } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { readJsonStore, atomicCompositeWrite } from '#db/pgAdapter.js';
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

async function _createSip(config, actor, body, requestContext: any = {}) {
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

  const store = await readJsonStore(config);
  const fund = (store.funds || []).find((f) => f.id === productId);
  if (!fund) {
    throw new HttpError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found.`);
  }
  if (!CLIENT_VISIBLE_STAGES.has(fund.lifecycleStage)) {
    throw new HttpError(400, 'PRODUCT_NOT_AVAILABLE', 'Product is not available for investment.');
  }

  // Idempotency: prevent duplicate SIP creation within 5 minutes for same user+fund+amount
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const existingPlan = (store.investmentPlans || []).find((p) =>
    p.userId === actor.userId &&
    p.productId === productId &&
    p.type === 'sip' &&
    p.amount === amount &&
    new Date(p.createdAt).getTime() > fiveMinutesAgo
  );
  if (existingPlan) {
    const existingPayment = (store.payments || []).find((p) => p.id === existingPlan.paymentId);
    const existingMandate = (store.mandates || []).find((m) => m.id === existingPlan.mandateId);
    return {
      planId: existingPlan.id,
      paymentId: existingPlan.paymentId,
      mandateId: existingPlan.mandateId,
      status: existingPlan.status,
      nextAction: 'complete_payment',
      paymentUrl: `/app/payment/${existingPlan.paymentId}`,
      providerOrderId: existingPayment?.providerOrderId || existingPayment?.providerPaymentId || null,
      providerKeyId: config.razorpayKeyId || null,
      providerName: existingPayment?.provider || getPaymentProvider(config).name,
      amount: existingPayment?.amount || existingPlan.amount,
      currency: existingPayment?.currency || 'INR',
    };
  }

  const minSipAmount = toNumber(fund.minSip, 500) || 500;
  const minDuration = toNumber(fund.minDurationMonths, 12) || 12;

  if (amount < minSipAmount) {
    throw new HttpError(400, 'BELOW_MINIMUM_AMOUNT', `Minimum SIP amount is ₹${minSipAmount}.`);
  }
  if (durationMonths < minDuration) {
    throw new HttpError(400, 'BELOW_MINIMUM_DURATION', `Minimum duration is ${minDuration} months.`);
  }
  if (debitDay < 1 || debitDay > 28) {
    throw new HttpError(400, 'INVALID_DEBIT_DAY', 'Debit day must be between 1 and 28.');
  }

  const now = new Date().toISOString();
  const planId = randomUUID();
  const transactionId = randomUUID();
  const paymentId = randomUUID();
  const mandateId = randomUUID();

  const plan = {
    id: planId,
    userId: actor.userId,
    productId,
    type: 'sip',
    amount,
    durationMonths,
    debitDay,
    status: 'submitted',
    transactionId,
    paymentId,
    mandateId,
    consentTextVersion,
    consentedAt,
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
    type: 'sip_installment',
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

  const payment = {
    id: paymentId,
    userId: actor.userId,
    transactionId,
    provider: provider.name,
    providerOrderId: order.id,
    providerPaymentId: order.id,
    amount,
    currency: 'INR',
    mode: 'upi_autopay',
    status: 'created',
    failureReason: null,
    lastFailureReason: null,
    attemptCount: 0,
    idempotencyKey: requestContext.idempotencyKey
      ? `sip_${actor.userId}_${requestContext.idempotencyKey}_payment`
      : `sip_${planId}_payment`,
    createdAt: now,
    confirmedAt: null,
    reconciledAt: null,
    updatedAt: now,
  };

  const mandate = {
    id: mandateId,
    userId: actor.userId,
    investmentPlanId: planId,
    provider: provider.name,
    providerMandateId: mandateToken.id || null,
    maxAmount: amount,
    frequency: 'monthly',
    debitDay,
    status: mandateToken.status === 'pending_user_auth' ? 'pending_user_auth' : 'setup_required',
    idempotencyKey: randomUUID(),
    validFrom: null,
    validTo: null,
    lastDebitAt: null,
    nextDebitAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // Finalize plan state before atomic persistence
  plan.status = 'pending_first_payment';
  plan.updatedAt = now;

  const existingPayment = store.payments.find((p) => p.idempotencyKey === payment.idempotencyKey);
  if (existingPayment) {
    const existingPlan = (store.investmentPlans || []).find((p) => p.paymentId === existingPayment.id);
    const existingMandate = (store.mandates || []).find((m) => m.id === (existingPlan?.mandateId));
    return {
      planId: existingPlan?.id || null,
      paymentId: existingPayment.id,
      mandateId: existingMandate?.id || null,
      status: existingPlan?.status || 'pending_first_payment',
      nextAction: 'complete_payment',
      paymentUrl: `/app/payment/${existingPayment.id}`,
      providerOrderId: existingPayment.providerOrderId || existingPayment.providerPaymentId || null,
      providerKeyId: config.razorpayKeyId || null,
      providerName: existingPayment.provider || provider.name,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
    };
  }

  const auditLog = {
    id: randomUUID(),
    adminId: actor?.userId || null,
    action: 'sip.create',
    entityType: 'investment_plan',
    entityId: planId,
    before: null,
    after: plan,
    reason: 'Client created SIP investment plan.',
    ipAddress: requestContext.ipAddress || null,
    userAgent: requestContext.userAgent || null,
    createdAt: now,
  };

  await atomicCompositeWrite(config, [
    { collection: 'investmentPlans', record: plan },
    { collection: 'transactions', record: transaction },
    { collection: 'payments', record: payment },
    { collection: 'mandates', record: mandate },
    { collection: 'adminAuditLogs', record: auditLog },
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
    amount: payment.amount,
    currency: payment.currency,
  };
}

export const createSip = withReceipt(_createSip, 'sip_created', {
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
