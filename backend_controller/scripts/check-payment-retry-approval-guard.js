import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retryPayment } from '../src/client/services/paymentService.js';

const tmpDir = await mkdtemp(join(tmpdir(), 'boe-payment-retry-authz-'));
const dbPath = join(tmpDir, 'dev-db.json');
const config = { dataStore: 'json', jsonDbPath: dbPath };

const baseStore = {
  users: [
    {
      id: 'user-pending-review',
      email: 'pending@example.test',
      role: 'client',
      status: 'pending_review',
    },
    {
      id: 'user-suspended',
      email: 'suspended@example.test',
      role: 'client',
      status: 'suspended',
    },
    {
      id: 'user-approved',
      email: 'approved@example.test',
      role: 'client',
      status: 'approved',
    },
  ],
  payments: [
    {
      id: 'payment-pending-owner',
      userId: 'user-pending-review',
      provider: 'mock',
      status: 'failed',
      idempotencyKey: 'payment-pending-owner-key',
      amount: 1000,
      currency: 'INR',
      attemptCount: 1,
      lastFailureReason: 'provider_declined',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
    {
      id: 'payment-suspended-owner',
      userId: 'user-suspended',
      provider: 'mock',
      status: 'failed',
      idempotencyKey: 'payment-suspended-owner-key',
      amount: 1000,
      currency: 'INR',
      attemptCount: 1,
      lastFailureReason: 'provider_declined',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
    {
      id: 'payment-approved-owner',
      userId: 'user-approved',
      provider: 'mock',
      status: 'failed',
      idempotencyKey: 'payment-approved-owner-key',
      amount: 1000,
      currency: 'INR',
      attemptCount: 1,
      lastFailureReason: 'provider_declined',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
  adminAuditLogs: [],
  receipts: [],
  approvalMigrationVersion: 7,
};

try {
  await writeFile(dbPath, `${JSON.stringify(baseStore, null, 2)}\n`, 'utf8');

  await assert.rejects(
    retryPayment(
      config,
      { userId: 'user-pending-review', role: 'client', status: 'approved' },
      'payment-pending-owner',
    ),
    (error) => error?.status === 403 && error?.code === 'USER_NOT_APPROVED',
    'pending_review store user should be rejected even if actor claims approved',
  );

  await assert.rejects(
    retryPayment(
      config,
      { userId: 'user-suspended', role: 'client', status: 'approved' },
      'payment-suspended-owner',
    ),
    (error) => error?.status === 403 && error?.code === 'USER_NOT_APPROVED',
    'suspended store user should be rejected even if actor claims approved',
  );

  let store = JSON.parse(await readFile(dbPath, 'utf8'));
  assert.equal(
    store.payments.find((payment) => payment.id === 'payment-pending-owner')?.status,
    'failed',
    'rejected pending-user payment must not be mutated',
  );
  assert.equal(
    store.payments.find((payment) => payment.id === 'payment-suspended-owner')?.status,
    'failed',
    'rejected suspended-user payment must not be mutated',
  );

  const retried = await retryPayment(
    config,
    { userId: 'user-approved', role: 'client', status: 'approved' },
    'payment-approved-owner',
  );

  assert.equal(retried.status, 'created');
  assert.equal(retried.attemptCount, 2);
  assert.equal(retried.lastFailureReason, null);

  store = JSON.parse(await readFile(dbPath, 'utf8'));
  assert.equal(
    store.payments.find((payment) => payment.id === 'payment-approved-owner')?.status,
    'created',
  );
  assert.equal(store.receipts.length, 1, 'approved retry should emit a receipt');

  console.log('payment retry approval guard smoke passed');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
