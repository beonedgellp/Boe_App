import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../store/SessionContext.jsx';
import { isClientShell } from '../../shared/appTarget.js';
import logo from '../../assets/logo.svg';

function postLoginPath(from) {
  if (!from) return isClientShell ? '/app/dashboard' : '/app/start';

  try {
    const decoded = decodeURIComponent(from);
    return decoded.startsWith('/app/') && decoded !== '/app/login' ? decoded : (isClientShell ? '/app/dashboard' : '/app/start');
  } catch {
    return isClientShell ? '/app/dashboard' : '/app/start';
  }
}

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

export default function Login() {
  const { login, signup } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    setMode(params.get('mode') === 'signup' ? 'signup' : 'signin');
  }, [params.get('mode')]);

  function switchMode(nextMode) {
    setErr('');
    setToast('');
    const next = new URLSearchParams(params);
    if (nextMode === 'signup') next.set('mode', 'signup');
    else next.delete('mode');
    setParams(next, { replace: true });
    setMode(nextMode);
  }

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

  async function onSignup(e) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || digits.length < 8 || signupPassword.length < 8) {
      setErr('Enter your name, valid email, phone number, and an 8 character password.');
      return;
    }

    setErr('');
    setSubmitting(true);
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'Client';
    try {
      await signup({ firstName, lastName, email, phone, password: signupPassword });
      navigate(isClientShell ? '/app/dashboard' : '/app/start', { replace: true });
    } catch (error) {
      setErr(error?.code === 'ACCOUNT_EXISTS' ? 'An account already exists for that email or phone.' : "Couldn't create the account. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function onForgot(e) {
    e.preventDefault();
    setToast('Password reset will be added here next.');
    setTimeout(() => setToast(''), 3200);
  }

  return (
    <>
      {submitting && <div className="apk-login-progress" />}
      <div className="auth-page">
        <section className="auth-copy">
          <Link to="/" className="auth-logo" aria-label="BeOnEdge home"><img src={logo} alt="BeOnEdge" /></Link>
          <div>
            <span className="be-eyebrow">BeOnEdge Wealth</span>
            <h1>One account for web and app.</h1>
            <p>Sign in with your registered email or phone number. New clients can create an account with only basic contact details.</p>
          </div>
          <div className="auth-copy-grid">
            <div><strong>Desktop first</strong><span>Use the full web dashboard from this browser.</span></div>
            <div><strong>App ready</strong><span>Download the app after sign-in whenever you need it.</span></div>
            <div><strong>Simple access</strong><span>Only basic contact details are required to create an account.</span></div>
          </div>
        </section>

        <section className="auth-card" aria-label="Account access">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              role="tab"
              aria-selected={mode === 'signin'}
              id="tab-signin"
              aria-controls="panel-signin"
              className={mode === 'signin' ? 'is-active' : ''}
              onClick={() => switchMode('signin')}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              id="tab-signup"
              aria-controls="panel-signup"
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </div>

          <div
            id="panel-signin"
            role="tabpanel"
            aria-labelledby="tab-signin"
            className={`auth-panel${mode === 'signin' ? ' is-active' : ''}`}
          >
            <form className="auth-form" onSubmit={onSignIn} noValidate>
              <div>
                <h2>Sign in</h2>
                <p>Use your email or phone number and password.</p>
              </div>
              {err && (
                <div className="apk-login-error" role="alert" aria-live="assertive">
                  {err}
                </div>
              )}
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
              <div className="auth-foot">
                <a href="#" onClick={onForgot}>Forgot password?</a>
              </div>
            </form>
          </div>

          <div
            id="panel-signup"
            role="tabpanel"
            aria-labelledby="tab-signup"
            className={`auth-panel${mode === 'signup' ? ' is-active' : ''}`}
          >
            <form className="auth-form" onSubmit={onSignup} noValidate>
              <div>
                <h2>Create account</h2>
                <p>Only basic contact details are required to create the account.</p>
              </div>
              {err && (
                <div className="apk-login-error" role="alert" aria-live="assertive">
                  {err}
                </div>
              )}
              <div className="be-field">
                <label htmlFor="signup-name">Name</label>
                <input
                  id="signup-name"
                  className="be-input"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="auth-field-row">
                <div className="be-field">
                  <label htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    className="be-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="be-field">
                  <label htmlFor="signup-phone">Phone</label>
                  <input
                    id="signup-phone"
                    className="be-input"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="be-field">
                <label htmlFor="signup-password">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="signup-password"
                    className="be-input"
                    type={showSignupPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowSignupPassword((v) => !v)}
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showSignupPassword} />
                  </button>
                </div>
              </div>
              <button type="submit" className="be-btn be-btn-primary be-btn-block be-btn-lg" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          </div>
        </section>
      </div>
      {toast && <div className="apk-toast" role="status" aria-live="polite">{toast}</div>}
    </>
  );
}
