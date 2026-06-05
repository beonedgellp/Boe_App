// Navigation model. Sign in / Sign up create a LEARNER account (the gateway
// account), never described as an investment or brokerage account.

export type NavLink = { label: string; href: string };

export const navLinks: readonly NavLink[] = [
  { label: 'Courses', href: '#courses' },
  { label: 'Premium', href: '#premium' },
  { label: 'News', href: '#news' },
  { label: 'Plans', href: '#plans' },
  { label: 'About', href: '#about' },
];

// Base host of the existing client app (the Vite + React surface that owns the
// learner-account auth flow). Configurable per environment; defaults to the
// dev host. "Sign in" hands off to the unchanged client login; "Sign up" stays
// on the landing page and scrolls to the learner-account capture form (#lead),
// which posts to the same backend onboarding endpoint.
const APP_BASE = (
  process.env.NEXT_PUBLIC_BEO_APP_BASE || 'http://127.0.0.1:5173'
).replace(/\/$/, '');

export const authLinks = {
  signIn: { label: 'Sign in', href: `${APP_BASE}/app/login` },
  signUp: { label: 'Sign up', href: '#lead' },
} as const;

export const primaryCta = { label: 'Start learning', href: '#courses' } as const;
export const secondaryCta = { label: 'See premium benefits', href: '#premium' } as const;
