# BeOnEdge — Public Website Kit

Trust-first marketing surface and onboarding entry point. Web-only — the APK never carries this surface.

## Screens covered
- Landing: market pulse strip, hero, fund spotlight, philosophy, product shelf, how-it-works, disclosures footer.
- Signup modal: 3-step form (identity → KYC capture → risk profile).
- Submitted state: thank-you screen with APK handoff.

## Components (`Components.jsx`)
- `WebsiteNav` — sticky top nav, Ivory translucent + blur once scrolled.
- `MarketPulse` — Ink strip with delayed indices, lives in page header (never sticky).
- `Hero` — editorial serif H1, fund-spotlight aside card with mini chart.
- `Philosophy` — three-up card grid: Patience / Transparency / Discipline.
- `FundShelf` — dark section, four-column row per product. Uses `Coming soon` gold badge.
- `HowItWorks` — four numbered steps under hairline rules.
- `SignupForm`, `SubmittedScreen` — modal flow.
- `Footer` — Ink footer with disclosures, three link columns.

## Open
`ui_kits/website/index.html` — try the **Open account** CTA to walk the modal flow.
