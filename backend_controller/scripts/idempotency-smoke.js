// Smoke test for Idempotency-Key support on client POST routes.
//
// Exercises the wrapper from src/http/idempotency.js around createLumpsumOrder
// (representative of the four covered routes). Verifies:
//   1. First call with key X creates a plan; returns 200-shaped result.
//   2. Same key + same body replays without creating a duplicate plan.
//   3. Same key + different body returns 409 IDEMPOTENCY_KEY_REUSED.
//   4. Two concurrent calls same key/body create only one plan; one is replayed.
//   5. No header → each call creates its own plan (back-compat).

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLumpsumOrder } from '#client/services/orderService.js';
import { withIdempotency, _resetInFlight } from '#http/idempotency.js';

const tmpDir = await mkdtemp(join(tmpdir(), 'boe-idempotency-smoke-'));
const dbPath = join(tmpDir, 'dev-db.json');
const config = { dataStore: 'json', jsonDbPath: dbPath, providerMode: 'mock' };

const actor = { userId: 'user-approved', role: 'client', status: 'approved' };

const baseStore = {
  users: [
    { id: 'user-approved', email: 'approved@example.test', role: 'client', status: 'approved' },
  ],
  funds: [
    {
      id: 'fund-1',
      name: 'Test Fund',
      lifecycleStage: 'active',
      minLumpsum: 1000,
      disclosureVersion: 'v1',
      disclosureText: 'test disclosure',
    },
  ],
  payments: [],
  investmentPlans: [],
  transactions: [],
  mandates: [],
  adminAuditLogs: [],
  receipts: [],
  requestIdempotency: [],
  approvalMigrationVersion: 7,
};

function makeContext({ key, amount, productId = 'fund-1' }) {
  const body = { productId, amount };
  const rawBody = JSON.stringify(body);
  const headers = key ? { 'idempotency-key': key } : {};
  return {
    config,
    actor,
    body,
    headers,
    params: {},
    query: {},
    req: { rawBody, headers },
  };
}

async function readPlans() {
  const store = JSON.parse(await readFile(dbPath, 'utf8'));
  return store.investmentPlans || [];
}

const ROUTE = '/v1/client/lumpsum-orders';
const wrapped = withIdempotency(ROUTE, ({ config: cfg, actor: a, body, headers }) => {
  return createLumpsumOrder(cfg, a, body, {
    ipAddress: null,
    userAgent: null,
    idempotencyKey: headers['idempotency-key'] || null,
  });
});

try {
  await writeFile(dbPath, `${JSON.stringify(baseStore, null, 2)}\n`, 'utf8');

  // --- Case 1: first call with key creates a plan ---
  _resetInFlight();
  const r1 = await wrapped(makeContext({ key: 'key-A', amount: 5000 }));
  assert.ok(r1, 'first call returns a result');
  let plans = await readPlans();
  assert.equal(plans.length, 1, 'first call creates one plan');
  console.log('  [1] first call created plan');

  // --- Case 2: same key + same body → replay, no new plan ---
  const r2 = await wrapped(makeContext({ key: 'key-A', amount: 5000 }));
  assert.equal(r2.headers?.['idempotent-replay'], 'true', 'replay header present');
  plans = await readPlans();
  assert.equal(plans.length, 1, 'replay does not create duplicate plan');
  // Compare bodies — replay should mirror the originally stored body
  const stored1Body = r1.planId ? r1 : r1.body;
  const stored2Body = r2.body ?? r2;
  assert.deepEqual(stored2Body, stored1Body, 'replay body matches original');
  console.log('  [2] replay returned same response, no duplicate side-effect');

  // --- Case 3: same key + different body → 409 ---
  let caught = null;
  try {
    await wrapped(makeContext({ key: 'key-A', amount: 9999 }));
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, 'mismatched body should throw');
  assert.equal(caught.status, 409);
  assert.equal(caught.code, 'IDEMPOTENCY_KEY_REUSED');
  plans = await readPlans();
  assert.equal(plans.length, 1, '409 path does not create a plan');
  console.log('  [3] mismatched body returned 409 IDEMPOTENCY_KEY_REUSED');

  // --- Case 4: concurrent calls same key/body → only one plan ---
  _resetInFlight();
  const [c1, c2] = await Promise.all([
    wrapped(makeContext({ key: 'key-B', amount: 7000 })),
    wrapped(makeContext({ key: 'key-B', amount: 7000 })),
  ]);
  plans = await readPlans();
  assert.equal(plans.length, 2, 'one new plan created (total 2 across cases)');
  // One of the two should carry the replay header
  const replayed = [c1, c2].filter((r) => r?.headers?.['idempotent-replay'] === 'true');
  assert.equal(replayed.length, 1, 'exactly one of the concurrent calls was replayed');
  console.log('  [4] concurrent calls produced only one side-effect; one replayed');

  // --- Case 5: no header → wrapper is bypassed; handler runs unwrapped.
  // The service has its own 5-minute same-amount dedup; use distinct amounts
  // to prove the wrapper does not block requests without the header.
  const before = (await readPlans()).length;
  await wrapped(makeContext({ key: null, amount: 8001 }));
  await wrapped(makeContext({ key: null, amount: 8002 }));
  const after = (await readPlans()).length;
  assert.equal(after - before, 2, 'no-header calls fall through to handler (back-compat)');
  console.log('  [5] no-header path bypasses idempotency layer (back-compat)');

  console.log('\nidempotency smoke passed');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
