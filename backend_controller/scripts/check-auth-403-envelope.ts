import assert from 'node:assert/strict';
import { authorizeRoute } from '#security/auth.js';
import { sendError } from '#http/response.js';

function captureError(error) {
  let statusCode = null;
  let payload = '';
  const res = {
    writeHead(status) {
      statusCode = status;
    },
    end(body) {
      payload = body;
    },
  };

  sendError(res, error, { requestId: 'req_authz_smoke' });
  return { statusCode, body: JSON.parse(payload) };
}

function assertEnvelope(error, expectedCode, expectedDetails) {
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
  () => authorizeRoute(baseRoute, { userId: 'u1', role: 'client', status: 'suspended' }),
  (error) => {
    assertEnvelope(error, 'ACCOUNT_DISABLED', { status: 'suspended' });
    return true;
  },
);

assert.throws(
  () => authorizeRoute({ ...baseRoute, roles: ['admin'] }, { userId: 'u1', role: 'client', status: 'approved' }),
  (error) => {
    assertEnvelope(error, 'ROLE_FORBIDDEN', { allowedRoles: ['admin'] });
    return true;
  },
);

assert.throws(
  () => authorizeRoute(baseRoute, { userId: 'u1', role: 'client', status: 'pending_review' }),
  (error) => {
    assertEnvelope(error, 'USER_NOT_APPROVED', { status: 'pending_review' });
    return true;
  },
);

console.log('auth 403 envelope smoke passed');
