import * as assert from 'node:assert';
import { authorizeRoute } from '#security/auth.js';
import { sendError } from '#http/response.js';

function captureError(error: any) {
  let statusCode = null;
  let payload = '';
  const res = {
    writeHead(status: any) {
      statusCode = status;
    },
    end(body: any) {
      payload = body;
    },
  };

  sendError(res as any, error, { requestId: 'req_authz_smoke' });
  return { statusCode, body: JSON.parse(payload) };
}

function assertEnvelope(error: any, expectedCode: any, expectedDetails: any) {
  const { statusCode, body } = captureError(error);
  assert.equal(statusCode, 403);
  assert.equal(body.ok, false);
  assert.equal(body.requestId, 'req_authz_smoke');
  assert.equal(body.error.code, expectedCode);
  assert.equal(typeof body.error.message, 'string');
  assert.deepEqual(body.error.details, expectedDetails);
}

const baseRoute = {
  auth: true,
  group: 'client',
  roles: ['client'],
  allowPendingClient: false,
  allowDisabledAccount: false,
};

assert.throws(
  () => authorizeRoute(baseRoute as any, { userId: 'u1', role: 'client', status: 'suspended' }),
  (error: any) => {
    assertEnvelope(error, 'ACCOUNT_DISABLED', { status: 'suspended' });
    return true;
  },
);

assert.throws(
  () => authorizeRoute({ ...baseRoute, roles: ['admin'] } as any, { userId: 'u1', role: 'client', status: 'approved' }),
  (error: any) => {
    assertEnvelope(error, 'ROLE_FORBIDDEN', { allowedRoles: ['admin'] });
    return true;
  },
);

assert.throws(
  () => authorizeRoute(baseRoute as any, { userId: 'u1', role: 'client', status: 'pending_review' }),
  (error: any) => {
    assertEnvelope(error, 'USER_NOT_APPROVED', { status: 'pending_review' });
    return true;
  },
);

console.log('auth 403 envelope smoke passed');
