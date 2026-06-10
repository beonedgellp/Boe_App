import { strict as assert } from 'node:assert';
import { describe, test } from 'node:test';
import { assertSignupAllowed } from './authService.js';

const SIGNUP_SECRET = 'test-signup-secret-with-enough-length';
const ALLOWED_ORIGIN = 'http://127.0.0.1:5173';

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


