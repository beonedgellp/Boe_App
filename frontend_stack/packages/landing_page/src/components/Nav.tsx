'use client';

import { useState } from 'react';
import { site } from '../content/site';
import { navLinks, authLinks, primaryCta } from '../content/nav';

// Sign in / Sign up create a LEARNER account (the gateway account). They are
// never described as opening an investment or brokerage account.
export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="container nav__inner">
        <a className="nav__brand" href="#top" aria-label={`${site.name} home`}>
          {site.name}
        </a>

        <nav aria-label="Primary">
          <ul className="nav__links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a className="nav__link" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions nav__desktop-actions">
          <a className="nav__signin" href={authLinks.signIn.href}>
            {authLinks.signIn.label}
          </a>
          <a className="btn btn--primary" href={primaryCta.href}>
            {primaryCta.label}
          </a>
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
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="nav__link"
                  href={link.href}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a className="nav__signin" href={authLinks.signIn.href}>
                {authLinks.signIn.label}
              </a>
            </li>
          </ul>
          <a
            className="btn btn--primary btn--block"
            href={primaryCta.href}
            onClick={() => setOpen(false)}
          >
            {primaryCta.label}
          </a>
        </div>
      ) : null}
    </header>
  );
}
