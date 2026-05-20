import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { updateUserStatus } from '../src/admin/services/adminDataService.js';
import { reviewKyc } from '../src/admin/services/kycReviewService.js';

const tmpDir = await mkdtemp(join(tmpdir(), 'boe-admin-status-audit-'));
const dbPath = join(tmpDir, 'dev-db.json');
const config = { dataStore: 'json', jsonDbPath: dbPath };
const admin = { userId: 'admin-user', role: 'admin', status: 'approved' };

const baseStore = {
  users: [
    {
      id: 'client-status',
      firstName: 'Status',
      lastName: 'Client',
      email: 'status@example.test',
      phone: '+911111111111',
      role: 'client',
      status: 'pending_review',
      riskProfileStatus: 'pending',
      kycStatus: 'pending',
      approvalRef: 'approval-status',
    },
    {
      id: 'client-kyc',
      firstName: 'Kyc',
      lastName: 'Client',
      email: 'kyc@example.test',
      phone: '+912222222222',
      role: 'client',
      status: 'pending_review',
      riskProfileStatus: 'pending',
      kycStatus: 'pending',
      approvalRef: 'approval-kyc',
    },
  ],
  kycProfiles: [
    {
      id: 'kyc-profile-client-kyc',
      userId: 'client-kyc',
      reviewStatus: 'pending',
      adminNotes: null,
      reviewedAt: null,
      reviewerId: null,
    },
  ],
  adminAuditLogs: [],
  receipts: [],
  approvalMigrationVersion: 7,
};

try {
  await writeFile(dbPath, `${JSON.stringify(baseStore, null, 2)}\n`, 'utf8');

  await updateUserStatus(
    config,
    admin,
    'client-status',
    { status: 'suspended', reason: 'Regression test suspension.' },
    { ipAddress: '127.0.0.1', userAgent: 'audit-smoke' },
  );

  let store = JSON.parse(await readFile(dbPath, 'utf8'));
  const statusLog = store.adminAuditLogs.find((log) => log.action === 'user.status.update');
  assert.ok(statusLog, 'user status update must write an admin audit log');
  assert.equal(statusLog.entityType, 'users');
  assert.equal(statusLog.entityId, 'client-status');
  assert.equal(statusLog.beforeJson.status, 'pending_review');
  assert.equal(statusLog.afterJson.status, 'suspended');
  assert.equal(statusLog.reason, 'Regression test suspension.');
  assert.equal(statusLog.ipAddress, '127.0.0.1');
  assert.equal(statusLog.userAgent, 'audit-smoke');

  await reviewKyc(
    config,
    admin,
    'client-kyc',
    { action: 'approve', reason: 'Regression test approval.' },
  );

  store = JSON.parse(await readFile(dbPath, 'utf8'));
  const kycLog = store.adminAuditLogs.find((log) => log.action === 'kyc.approve');
  assert.ok(kycLog, 'KYC approval must write an admin audit log');
  assert.equal(kycLog.entityType, 'kyc_profile');
  assert.equal(kycLog.entityId, 'kyc-profile-client-kyc');
  assert.equal(kycLog.before.status, 'pending_review');
  assert.equal(kycLog.after.status, 'approved');
  assert.equal(kycLog.reason, 'Regression test approval.');

  console.log('admin status audit smoke passed');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
