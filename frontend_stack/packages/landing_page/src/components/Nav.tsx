'use client';

import { useState } from 'react';
import Link from 'next/link';
import { navDefaults } from '../lib/landingDefaults';
import type { NavDefaults } from '../lib/landingDefaults';
import { useAuth } from './AuthProvider';
import ThemeToggle from './ThemeToggle';

function displayName(user: { firstName?: string; name?: string; username?: string | null } | null) {
  return user?.firstName || user?.name || user?.username || 'there';
}

export default function Nav({
  nav = navDefaults,
  siteName = navDefaults.signUp.label,
}: {
  nav?: Partial<NavDefaults>;
  siteName?: string;
}) {
  const resolved = { ...navDefaults, ...nav };
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const { user, logout } = useAuth();

  async function onLogout() {
    setLogoutError('');
    try {
      await logout();
      setOpen(false);
    } catch {
      setLogoutError('Signed out locally. Please refresh if the session remains active.');
    }
  }

  const authActions = user ? (
    <>
      <span className="nav__user">Hi {displayName(user)}</span>
      <button type="button" className="nav__logout" onClick={onLogout}>
        Log out
      </button>
    </>
  ) : (
    <>
      <Link className="nav__signin" href={resolved.signIn.href}>
        {resolved.signIn.label}
      </Link>
      <Link className="btn btn--primary" href={resolved.signUp.href}>
        {resolved.signUp.label}
      </Link>
    </>
  );

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link className="nav__brand" href="/" aria-label={`${siteName} home`}>
          {siteName}
        </Link>

        <nav aria-label="Primary">
          <ul className="nav__links">
            {resolved.links.map((link) => (
              <li key={link.href}>
                <Link className="nav__link" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions nav__desktop-actions">
          <ThemeToggle />
          {authActions}
        </div>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div className="nav__mobile" id="nav-mobile">
          <ul>
            {resolved.links.map((link) => (
              <li key={link.href}>
                <Link className="nav__link" href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <span className="nav__user">Hi {displayName(user)}</span>
              ) : (
                <Link className="nav__signin" href={resolved.signIn.href} onClick={() => setOpen(false)}>
                  {resolved.signIn.label}
                </Link>
              )}
            </li>
          </ul>
          {user ? (
            <button type="button" className="btn btn--primary btn--block" onClick={onLogout}>
              Log out
            </button>
          ) : (
            <Link className="btn btn--primary btn--block" href={resolved.signUp.href} onClick={() => setOpen(false)}>
              {resolved.signUp.label}
            </Link>
          )}
          {logoutError ? <p className="form__status form__status--error">{logoutError}</p> : null}
        </div>
      ) : null}
      {logoutError && !open ? (
        <div className="container">
          <p className="form__status form__status--error nav__error">{logoutError}</p>
        </div>
      ) : null}
    </header>
  );
}
