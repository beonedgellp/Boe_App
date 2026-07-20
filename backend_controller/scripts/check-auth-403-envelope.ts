import * as assert from 'node:assert';
import { authorizeRoute } from '#security/auth.js';
import { sendError } from '#http/response.js';
import type { Actor, RouteMeta } from '#types/index.js';

interface ErrorEnvelope {
  ok: boolean;
  requestId: string;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
}

/** Minimal http.ServerResponse surface exercised by sendError(). */
interface ResponseCapture {
  writeHead(status: number, headers?: Record<string, unknown>): void;
  end(body?: string): void;
}

function captureError(error: unknown): { statusCode: number | null; body: ErrorEnvelope } {
  let statusCode: number | null = null;
  let payload = '';
  const res: ResponseCapture = {
    writeHead(status: number) {
      statusCode = status;
    },
    end(body = '') {
      payload = body;
    },
  };

  sendError(res, error, { requestId: 'req_authz_smoke' });
  return { statusCode, body: JSON.parse(payload) as ErrorEnvelope };
}

function assertEnvelope(error: unknown, expectedCode: string, expectedDetails: unknown): void {
  const { statusCode, body } = captureError(error);
  assert.equal(statusCode, 403);
  assert.equal(body.ok, false);
  assert.equal(body.requestId, 'req_authz_smoke');
  assert.equal(body.error.code, expectedCode);
  assert.equal(typeof body.error.message, 'string');
  assert.deepEqual(body.error.details, expectedDetails);
}

const baseRoute: RouteMeta = {
  method: 'GET',
  path: '/__smoke/authz',
  auth: true,
  group: 'client',
  roles: ['client'],
  allowPendingClient: false,
  allowDisabledAccount: false,
  description: 'authz smoke test route',
};

const suspendedClient: Actor = { userId: 'u1', role: 'client', status: 'suspended' };
const approvedClient: Actor = { userId: 'u1', role: 'client', status: 'approved' };
const pendingClient: Actor = { userId: 'u1', role: 'client', status: 'pending_review' };

assert.throws(
  () => authorizeRoute(baseRoute, suspendedClient),
  (error: unknown) => {
    assertEnvelope(error, 'ACCOUNT_DISABLED', { status: 'suspended' });
    return true;
  },
);

assert.throws(
  () => authorizeRoute({ ...baseRoute, roles: ['admin'] }, approvedClient),
  (error: unknown) => {
    assertEnvelope(error, 'ROLE_FORBIDDEN', { allowedRoles: ['admin'] });
    return true;
  },
);

assert.throws(
  () => authorizeRoute(baseRoute, pendingClient),
  (error: unknown) => {
    assertEnvelope(error, 'USER_NOT_APPROVED', { status: 'pending_review' });
    return true;
  },
);

console.log('auth 403 envelope smoke passed');
