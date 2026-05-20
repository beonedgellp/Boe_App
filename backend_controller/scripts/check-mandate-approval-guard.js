import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authorizeMandate } from '#client/services/mandateService.js';

const tmpDir = await mkdtemp(join(tmpdir(), 'boe-mandate-authz-'));
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
      id: 'user-approved',
      email: 'approved@example.test',
      role: 'client',
      status: 'approved',
    },
  ],
  mandates: [
    {
      id: 'mandate-pending-owner',
      userId: 'user-pending-review',
      provider: 'mock',
      status: 'setup_required',
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
    {
      id: 'mandate-approved-owner',
      userId: 'user-approved',
      provider: 'mock',
      status: 'setup_required',
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
    authorizeMandate(
      config,
      { userId: 'user-pending-review', role: 'client', status: 'approved' },
      'mandate-pending-owner',
    ),
    (error) => error?.status === 403 && error?.code === 'USER_NOT_APPROVED',
    'pending_review store user should be rejected even if actor claims approved',
  );

  let store = JSON.parse(await readFile(dbPath, 'utf8'));
  assert.equal(
    store.mandates.find((mandate) => mandate.id === 'mandate-pending-owner')?.status,
    'setup_required',
    'rejected mandate must not be mutated',
  );

  const authorized = await authorizeMandate(
    config,
    { userId: 'user-approved', role: 'client', status: 'approved' },
    'mandate-approved-owner',
  );

  assert.equal(authorized.status, 'active');
  store = JSON.parse(await readFile(dbPath, 'utf8'));
  assert.equal(
    store.mandates.find((mandate) => mandate.id === 'mandate-approved-owner')?.status,
    'active',
  );
  assert.equal(store.receipts.length, 1, 'approved authorization should emit a receipt');

  console.log('mandate approval guard smoke passed');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
