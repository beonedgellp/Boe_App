import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcilePayment } from '#admin/services/paymentReconcileService.js';

const tmpDir = await mkdtemp(join(tmpdir(), 'boe-payment-reconcile-'));
const dbPath = join(tmpDir, 'dev-db.json');
const config = { dataStore: 'json', jsonDbPath: dbPath };
const admin = { userId: 'admin-user', role: 'admin', status: 'approved' };

const baseStore = {
  users: [
    { id: 'client-user', role: 'client', status: 'approved', email: 'client@example.test' },
  ],
  investmentPlans: [
    {
      id: 'plan-1',
      userId: 'client-user',
      status: 'pending_first_payment',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
  transactions: [
    {
      id: 'tx-1',
      userId: 'client-user',
      investmentPlanId: 'plan-1',
      status: 'payment_pending',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
  payments: [
    {
      id: 'payment-1',
      userId: 'client-user',
      transactionId: 'tx-1',
      provider: 'razorpay',
      providerPaymentId: 'pay_test_123',
      amount: 5000,
      currency: 'INR',
      status: 'success',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
  adminAuditLogs: [],
  receipts: [],
  reconciliationLedger: [],
  approvalMigrationVersion: 7,
};

try {
  await writeFile(dbPath, `${JSON.stringify(baseStore, null, 2)}\n`, 'utf8');

  await assert.rejects(
    reconcilePayment(config, admin, 'payment-1', {}),
    (error) => error?.status === 400 && error?.code === 'RECONCILE_REASON_REQUIRED',
    'reconcile must require a reason',
  );

  const result = await reconcilePayment(
    config,
    admin,
    'payment-1',
    { reason: 'Razorpay settlement verified.', settlementReference: 'setl_test_123' },
    { ipAddress: '127.0.0.1', userAgent: 'reconcile-smoke' },
  );

  assert.equal(result.payment.status, 'reconciled');
  assert.equal(result.ledgerEntry.previousStatus, 'success');
  assert.equal(result.ledgerEntry.reconciledStatus, 'reconciled');

  const store = JSON.parse(await readFile(dbPath, 'utf8'));
  assert.equal(store.payments[0].status, 'reconciled');
  assert.equal(store.transactions[0].status, 'payment_confirmed');
  assert.equal(store.investmentPlans[0].status, 'active');
  assert.equal(store.reconciliationLedger.length, 1);
  assert.equal(store.reconciliationLedger[0].settlementReference, 'setl_test_123');
  assert.equal(store.adminAuditLogs.length, 1);
  assert.equal(store.adminAuditLogs[0].action, 'payment.reconcile');
  assert.equal(store.adminAuditLogs[0].ipAddress, '127.0.0.1');
  assert.equal(store.receipts.length, 1);
  assert.equal(store.receipts[0].kind, 'payment_reconciled');
  assert.equal(store.receipts[0].beforeState, 'success');
  assert.equal(store.receipts[0].afterState, 'reconciled');

  await assert.rejects(
    reconcilePayment(config, admin, 'payment-1', { reason: 'second try' }),
    (error) => error?.status === 409 && error?.code === 'PAYMENT_ALREADY_RECONCILED',
    'reconcile must reject already reconciled payments',
  );

  console.log('admin payment reconcile smoke passed');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
