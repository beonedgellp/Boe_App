import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../store/SessionContext.tsx';
import { openOnboarding } from '../utils/openOnboarding.ts';

function EyeIcon({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
}

function postLoginPath(from) {
  if (!from) return '/app/dashboard';
  try {
    const decoded = decodeURIComponent(from);
    return decoded.startsWith('/app/') && decoded !== '/app/login' ? decoded : '/app/dashboard';
  } catch {
    return '/app/dashboard';
  }
}

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  async function onSignIn(e) {
    e.preventDefault();
    if (!identifier || !password) {
      setErr('Enter your email or phone, and password.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await login({ identifier, password });
      navigate(postLoginPath(params.get('from')), { replace: true });
    } catch (error) {
      setErr(error?.code === 'ADMIN_LOGIN_REQUIRED'
        ? 'Use the admin login page for admin access.'
        : "Couldn't sign in. Check your email, phone, or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="apk-login-page">
      {submitting && <div className="apk-login-progress" />}
      <div className="apk-login-card">
        <div className="apk-login-header">
          <h1 className="apk-login-title">Sign in</h1>
          <p className="apk-login-sub">Enter your credentials to continue.</p>
        </div>

        {err && (
          <div className="apk-login-error" role="alert" aria-live="assertive">
            {err}
          </div>
        )}

        <form className="apk-login-form" onSubmit={onSignIn} noValidate>
          <div className="be-field">
            <label htmlFor="ident">Email or phone</label>
            <input
              id="ident"
              className="be-input"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="be-field">
            <label htmlFor="pwd">Password</label>
            <div className="auth-input-wrap">
              <input
                id="pwd"
                className="be-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          <button type="submit" className="be-btn be-btn-primary be-btn-block be-btn-lg" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="apk-login-foot">
          <span className="apk-login-foot-text">New to BeOnEdge?</span>
          <button type="button" className="apk-login-link" onClick={openOnboarding}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
