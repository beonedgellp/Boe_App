import type { PaymentReconcileBody, RequestContext } from '#types/services.js';
import type { AppConfig, Actor, UnknownRecord, StoreRecord } from '#types/index.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { prisma } from '#db/prisma.js';
import { withReceipt } from '#shared/services/withReceipt.js';
import { getPaymentProvider } from '#shared/services/payments/providerFactory.js';

async function _reconcilePayment(config: AppConfig, actor: Actor, paymentId: string, body: PaymentReconcileBody, requestContext: RequestContext = {}) {
  const reason = String(body?.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'Reconciliation reason is required.');
  }

  const providerName = String(body?.provider || 'mock').trim();
  const provider = getPaymentProvider(config, providerName);

  const now = new Date();

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');

  const before = { ...payment };

  // If provider is razorpay, fetch fresh state from Razorpay
  let providerStatus: string | null = null;
  if (providerName === 'razorpay' && payment.providerPaymentId) {
    try {
      const providerPayment = (provider as any).fetchPayment(payment.providerPaymentId);
      providerStatus = providerPayment.status;
    } catch {
      providerStatus = null;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'reconciled',
        reconciledAt: now,
        updatedAt: now,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        id: randomUUID(),
        adminId: actor?.userId || null,
        action: 'payment.reconcile',
        entityType: 'payment',
        entityId: payment.id,
        beforeJson: before as any,
        afterJson: { ...updatedPayment, providerStatus } as any,
        reason,
        ipAddress: requestContext.ipAddress || null,
        userAgent: requestContext.userAgent || null,
      },
    });

    return updatedPayment;
  });

  const ledgerEntry = {
    id: randomUUID(),
    paymentId: payment.id,
    userId: payment.userId,
    amount: payment.amount,
    currency: payment.currency,
    previousStatus: before.status,
    reconciledStatus: 'reconciled',
    providerStatus,
    reason,
    reconciledBy: actor?.userId || null,
    createdAt: now.toISOString(),
  };

  return { ...result, ledgerEntry };
}

export const reconcilePayment = withReceipt(_reconcilePayment, 'payment_reconciled', {
  entityType: 'payment',
  entityId: (result: any) => result.id,
  afterState: (result: any) => result.status,
  amount: (result: any) => result.amount ?? null,
  currency: (result: any) => result.currency ?? null,
  source: 'derived',
});

export async function listReconciliationLedger(config: AppConfig, { paymentId, limit = 50 }: { paymentId?: string; limit?: number } = {}) {
  const where: any = { action: 'payment.reconcile' };
  if (paymentId) where.entityId = paymentId;

  const items = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return { items, count: items.length };
}
