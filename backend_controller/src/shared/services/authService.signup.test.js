import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strict as assert } from 'node:assert';
import { after, before, describe, test } from 'node:test';
import { assertSignupAllowed, signup } from './authService.js';

const SIGNUP_SECRET = 'test-signup-secret-with-enough-length';
const ALLOWED_ORIGIN = 'http://127.0.0.1:5173';

let tempDir;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'boe-auth-signup-'));
});

after(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

function jsonConfig(overrides = {}) {
  return {
    dataStore: 'json',
    jsonDbPath: join(tempDir, `${randomUUID()}.json`),
    accessTokenSecret: 'test-access-token-secret-with-enough-length',
    refreshTokenSecret: 'test-refresh-token-secret-with-enough-length',
    signupProxySecret: SIGNUP_SECRET,
    signupAllowedOrigin: '',
    ...overrides,
  };
}

function validSignup(overrides = {}) {
  return {
    name: 'Asha Client',
    username: 'asha_client',
    email: 'asha@example.com',
    phone: '+91 98765 43210',
    password: 'Password123',
    ...overrides,
  };
}

function assertHttpError(error, status, code) {
  assert.equal(error.status, status);
  assert.equal(error.code, code);
}

describe('assertSignupAllowed', () => {
  test('throws 403 when a signup secret is configured and the header is missing', () => {
    assert.throws(
      () => assertSignupAllowed({ signupProxySecret: SIGNUP_SECRET }, {}),
      (error) => {
        assertHttpError(error, 403, 'SIGNUP_NOT_ALLOWED');
        return true;
      },
    );
  });

  test('throws 403 when a signup secret is configured and the header is wrong', () => {
    assert.throws(
      () => assertSignupAllowed(
        { signupProxySecret: SIGNUP_SECRET },
        { 'x-signup-key': 'wrong-secret' },
      ),
      (error) => {
        assertHttpError(error, 403, 'SIGNUP_NOT_ALLOWED');
        return true;
      },
    );
  });

  test('passes when the signup secret matches', () => {
    assert.doesNotThrow(() => assertSignupAllowed(
      { signupProxySecret: SIGNUP_SECRET },
      { 'x-signup-key': SIGNUP_SECRET },
    ));
  });

  test('falls back to the allowed origin when no signup secret is configured', () => {
    assert.doesNotThrow(() => assertSignupAllowed(
      { signupProxySecret: '', signupAllowedOrigin: ALLOWED_ORIGIN },
      { origin: ALLOWED_ORIGIN },
    ));

    assert.throws(
      () => assertSignupAllowed(
        { signupProxySecret: '', signupAllowedOrigin: ALLOWED_ORIGIN },
        { origin: 'http://127.0.0.1:9999' },
      ),
      (error) => {
        assertHttpError(error, 403, 'SIGNUP_NOT_ALLOWED');
        return true;
      },
    );
  });

  test('allows signup in development when neither gate is configured', () => {
    assert.doesNotThrow(() => assertSignupAllowed(
      { signupProxySecret: '', signupAllowedOrigin: '' },
      {},
    ));
  });
});

describe('signup username handling', () => {
  test('rejects an invalid username before creating an account', async () => {
    await assert.rejects(
      () => signup(
        validSignup({ username: 'Bad Name!' }),
        jsonConfig(),
        { headers: { 'x-signup-key': SIGNUP_SECRET } },
      ),
      (error) => {
        assertHttpError(error, 400, 'USERNAME_INVALID');
        return true;
      },
    );
  });

  test('stores normalized usernames and enforces username uniqueness', async () => {
    const config = jsonConfig();
    const headers = { 'x-signup-key': SIGNUP_SECRET };
    const first = await signup(validSignup({ username: 'Asha_Client' }), config, { headers });

    assert.equal(first.user.username, 'asha_client');

    await assert.rejects(
      () => signup(
        validSignup({
          username: 'asha_client',
          email: 'different@example.com',
          phone: '+91 98765 43211',
        }),
        config,
        { headers },
      ),
      (error) => {
        assertHttpError(error, 409, 'ACCOUNT_EXISTS');
        return true;
      },
    );
  });
});
