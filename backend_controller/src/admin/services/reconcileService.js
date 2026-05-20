import { randomUUID } from 'node:crypto';
import { HttpError } from '#http/errors.js';
import { jsonStoreEnabled, readJsonStore, updateJsonStore } from '#db/jsonStore.js';
import { withReceipt } from '#shared/services/withReceipt.js';
import { getPaymentProvider } from '#shared/services/payments/providerFactory.js';

async function _reconcilePayment(config, actor, paymentId, body, requestContext = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for reconciliation is not yet implemented.');
  }

  const reason = String(body?.reason || '').trim();
  if (!reason) {
    throw new HttpError(400, 'REASON_REQUIRED', 'Reconciliation reason is required.');
  }

  const providerName = String(body?.provider || 'mock').trim();
  const provider = getPaymentProvider(config, providerName);

  const now = new Date().toISOString();

  const result = await updateJsonStore(config, (store) => {
    const payment = (store.payments || []).find((p) => p.id === paymentId);
    if (!payment) return null;

    const before = { ...payment };

    // If provider is razorpay, fetch fresh state from Razorpay
    let providerStatus = null;
    if (providerName === 'razorpay' && payment.providerPaymentId) {
      try {
        const providerPayment = provider.fetchPayment(payment.providerPaymentId);
        providerStatus = providerPayment.status;
      } catch {
        providerStatus = null;
      }
    }

    payment.status = 'reconciled';
    payment.reconciledAt = now;
    payment.reconciledBy = actor?.userId || null;
    payment.reconcileReason = reason;
    payment.providerStatus = providerStatus || payment.status;

    // Write reconciliation ledger entry
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
      createdAt: now,
    };
    if (!Array.isArray(store.reconciliationLedger)) store.reconciliationLedger = [];
    store.reconciliationLedger.push(ledgerEntry);

    // Audit log
    if (!Array.isArray(store.adminAuditLogs)) store.adminAuditLogs = [];
    store.adminAuditLogs.push({
      id: randomUUID(),
      adminId: actor?.userId || null,
      action: 'payment.reconcile',
      entityType: 'payment',
      entityId: payment.id,
      before,
      after: { ...payment },
      reason,
      ipAddress: requestContext.ipAddress || null,
      userAgent: requestContext.userAgent || null,
      createdAt: now,
    });

    return { ...payment, ledgerEntry };
  });

  if (!result) throw new HttpError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
  return result;
}

export const reconcilePayment = withReceipt(_reconcilePayment, 'payment_reconciled', {
  entityType: 'payment',
  entityId: (result) => result.id,
  afterState: (result) => result.status,
  amount: (result) => result.amount ?? null,
  currency: (result) => result.currency ?? null,
  source: 'derived',
});

export async function listReconciliationLedger(config, { paymentId, limit = 50 } = {}) {
  if (!jsonStoreEnabled(config)) {
    throw new HttpError(503, 'DATABASE_NOT_CONFIGURED', 'PostgreSQL persistence for reconciliation ledger is not yet implemented.');
  }
  const store = await readJsonStore(config);
  let items = store.reconciliationLedger || [];
  if (paymentId) {
    items = items.filter((entry) => entry.paymentId === paymentId);
  }
  items = items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  return { items, count: items.length };
}
