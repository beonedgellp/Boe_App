import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { authenticateRequest, authorizeRoute } from '#security/auth.js';
import { createAccessToken } from '#security/tokens.js';

function decodePayload(token) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

const tmpDir = await mkdtemp(join(tmpdir(), 'boe-jwt-status-'));
const dbPath = join(tmpDir, 'dev-db.json');
const config = {
  dataStore: 'json',
  jsonDbPath: dbPath,
  accessTokenSecret: 'jwt-status-store-authority-secret-32b',
};

const route = {
  auth: true,
  group: 'client',
  roles: ['client'],
  allowPendingClient: false,
  allowDisabledAccount: false,
};

const store = {
  users: [
    {
      id: 'client-pending',
      email: 'pending@example.test',
      role: 'client',
      status: 'pending_review',
    },
    {
      id: 'client-suspended',
      email: 'suspended@example.test',
      role: 'client',
      status: 'suspended',
    },
  ],
  deviceSessions: [
    {
      id: 'session-suspended',
      userId: 'client-suspended',
      deviceId: 'test-device',
      refreshTokenHash: 'unused',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      revokedAt: null,
      createdAt: '2026-05-09T00:00:00.000Z',
      updatedAt: '2026-05-09T00:00:00.000Z',
    },
  ],
  approvalMigrationVersion: 7,
};

try {
  await writeFile(dbPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');

  const noSessionToken = createAccessToken({
    sub: 'client-pending',
    role: 'client',
    status: 'approved',
  }, config);
  assert.equal(decodePayload(noSessionToken).status, undefined, 'access token payload must not contain status');

  const noSessionActor = await authenticateRequest({
    headers: { authorization: `Bearer ${noSessionToken}` },
  }, config);
  assert.equal(noSessionActor.status, 'pending_review', 'actor status must come from JSON store');

  assert.throws(
    () => authorizeRoute(route, noSessionActor),
    (error) => error?.status === 403 && error?.code === 'USER_NOT_APPROVED',
    'pending user must be rejected even when token attempted to claim approved',
  );

  const sessionToken = createAccessToken({
    sub: 'client-suspended',
    role: 'client',
    status: 'approved',
    deviceSessionId: 'session-suspended',
  }, config);
  assert.equal(decodePayload(sessionToken).status, undefined, 'session token payload must not contain status');

  const sessionActor = await authenticateRequest({
    headers: { authorization: `Bearer ${sessionToken}` },
  }, config);
  assert.equal(sessionActor.status, 'suspended', 'device-session actor status must come from JSON store');

  assert.throws(
    () => authorizeRoute(route, sessionActor),
    (error) => error?.status === 403 && error?.code === 'ACCOUNT_DISABLED',
    'suspended user must be rejected even when token attempted to claim approved',
  );

  console.log('jwt status store-authority smoke passed');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
