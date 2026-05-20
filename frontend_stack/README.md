# BeOnEdge — Design System

BeOnEdge is an Indian institutional wealth-management platform. Clients discover BeOnEdge investment products (Growth Fund as MVP; Static Fund and Algo-Trade Fund coming soon), complete onboarding on the web, and run their daily investing life from a mobile APK — SIPs, lumpsums, mandates, transactions, statements.

This is a **trust-first** brand. The product must read as a serious wealth firm, not a trading-tip channel, fintech meme app, or guaranteed-return gimmick. Tone is calm, precise, and quietly confident.

## Preview app

```bash
npm install
npm run dev
```

The runnable Vite app lives in `app/`, but root-level npm scripts delegate there through the workspace configuration.

## Android Client Testing

The Android APK is built from the React/Vite app in `app/` through Capacitor. The APK is client-only: website and admin routes stay available in the browser build, while the Android build opens the `/app/*` client surface.

Start the emulator:

```bash
emulator -avd boe_pixel_api36 -gpu host -no-snapshot-load
```

From the repository root, rebuild and reinstall the APK into the running emulator:

```bash
emu/boe_update.sh
```

The helper detects the running emulator, syncs Capacitor assets, builds `app-debug.apk`, ensures `adb reverse tcp:47502 tcp:47502` exists for local backend access, reinstalls the APK, and launches `com.beonedge.app`.

## Surfaces

| Surface | Purpose | Platform |
|---|---|---|
| **Public Website** | Brand story, fund philosophy, signup, KYC capture, APK handoff, legal | Web (desktop + responsive) |
| **Client APK** | Daily investor experience — login, dashboard, explore, SIP/lumpsum, mandates, history | Android (mobile-first web wrapped via Capacitor) |
| **Admin Console** | Approvals, KYC review, fund CMS, NAV/holdings upload, payment reconciliation, mandate ops, audit logs | Web only — never bundled into APK |

A fourth surface exists as a **future** server-to-server boundary: the algo-engine analytics provider. Clients never touch it directly.

## Product shelf

- **BeOnEdge Growth Fund** — active MVP product. `fund_style_product` or `model_portfolio`; exact regulatory label is admin-configured.
- **BeOnEdge Static Fund** — coming soon.
- **BeOnEdge Algo-Trade Fund** — coming soon, backed later by reviewed algo-engine analytics.

Hard MVP floors (admin-overridable): SIP ₹500/month, lumpsum ₹5,000, SIP duration 12 months.

## Sources

This design system was built from a single source: a Product Requirements Document (PRD) provided in-chat describing BeOnEdge's product philosophy, surfaces, journeys, state machines, and design direction. **No codebase, Figma file, or visual assets were attached** — visual decisions in this system are extrapolated from the PRD's stated design principles (deep ink, ivory, muted gold, slate, signal red/green; Indian institutional wealth feel). When a real codebase or brand kit lands, this system should be reconciled against it.

Reference URLs called out in the PRD (not fetched, retained as context for the human reader):
- SEBI investor caution: https://investor.sebi.gov.in/cautiontoinvestor.html
- SEBI AIF press release: https://www.sebi.gov.in/media/press-releases/may-2012/sebi-notifies-sebi-alternative-investment-funds-regulations-2012_22799.html
- NPCI UPI AutoPay overview: https://www.npci.org.in/what-we-do/autopay/product-overview
- Competitive benchmarks: Groww, Zerodha Coin, smallcase, Upstox, INDmoney, ET Money

## Index

```
README.md                 — this file
SKILL.md                  — agent skill manifest
colors_and_type.css       — design tokens (color, type, spacing, radii, shadows)
fonts/                    — webfont files (Google Fonts substitutes — see Caveats)
assets/                   — logo, marks, illustrations
preview/                  — design system preview cards (rendered in Design System tab)
ui_kits/
  website/                — public onboarding website kit
  apk/                    — client mobile APK kit
  admin/                  — admin console kit
```

---

## Content Fundamentals

**Voice.** Calm, exact, quietly authoritative. The product talks like a senior portfolio manager writing a client memo, not a growth-marketer or a finfluencer. Sentences are short and declarative. Numbers are concrete; adjectives are scarce.

**Person.** Second person ("You") to the client, but used sparingly — most copy is informational and stands without a pronoun. Never "we promise", "we guarantee", "join the family". The firm refers to itself as **BeOnEdge** in long form and never as "BOE" or "BE" in client-facing surfaces.

**Casing.** Sentence case for body, buttons, navigation, and table headers. Title Case reserved for proper nouns: product names ("BeOnEdge Growth Fund"), legal section titles ("Risk Disclosure"), and document titles ("Account Statement"). All-caps used only for **eyebrows** (small section labels above headlines) and **state badges** (ACTIVE, PAUSED, PENDING). Never SHOUTY in body copy.

**Numbers.** All currency is Indian Rupee, formatted Indian-style: ₹1,25,000 (lakh-crore grouping), not ₹125,000. Always show the ₹ symbol, never "INR" or "Rs." in client-facing UI. Two decimals for NAV (₹128.42), zero decimals for amounts and portfolio values (₹1,25,000), four decimals for units (1245.6810). Returns shown as +12.4% / −3.1% with a leading sign and thin space before the % sign. Negative values use the en-dash style minus, not parentheses.

**Forbidden language.** No "guaranteed return", "fixed return", "assured profit", "risk-free", "100% safe", "multibagger", "hot pick", "guru", "tip". No emoji in financial UI. No exclamation marks. No countdown timers, no FOMO copy, no "limited slots". Disclosure text is plain and unhedged — "Investments are subject to market risk."

**Disclosure as design.** Every money screen carries a source + freshness label and a one-line disclosure. Examples:
- `NAV ₹128.42 · As of 28 Apr 2026, 6:00 PM IST · Admin published`
- `Projected returns are illustrative, not guaranteed. Based on 5-yr historical CAGR.`
- `Past performance does not guarantee future returns.`

**Examples.**

> ✅ "Start a SIP from ₹500 a month. Your first payment runs through UPI; recurring debits use AutoPay."
>
> ✅ "BeOnEdge Growth Fund · Equity-led model portfolio · Recommended horizon 5 yr+"
>
> ✅ "Mandate paused. No debits will run until you resume."
>
> ❌ "Get assured 18% returns 🚀 Start your wealth journey today!"
>
> ❌ "Don't miss out — top fund of the month!"

**Empty states.** Specific, not chirpy. "No transactions yet. Once your first SIP runs, it appears here." Never "Oops, nothing here!".

**Errors.** Plain, blame-free, with the next action. "Payment couldn't be confirmed. Retry, or use a different UPI handle." Never "Something went wrong."

---

## Visual Foundations

**Palette.** A restrained five-token core, expressed in `oklch` for perceptual consistency.

- **Ink** `#0E1116` — primary surface and primary text on light. Deep neutral, almost black, with a hint of cool slate.
- **Ivory** `#F6F1E7` — primary canvas. Warm off-white with a paper feel; dampens the harshness of pure white in dense data tables.
- **Bone** `#FFFCF6` — pure light surface for cards/sheets sitting on Ivory.
- **Slate** `#5C6470` — mid-grey for secondary text, dividers, axis labels.
- **Gold** `#B5894A` — muted, brushed-brass accent. Used sparingly: brand mark, primary CTAs on dark, eyebrow accents, fund-name underlines. Never used as a chart series color or for pass/fail state.

**Financial-state colors.** Used **only** for money signal — gain/loss, mandate status, payment status. Never decorative.

- **Signal Green** `#1F7A4D` — gains, success, active mandate.
- **Signal Red** `#B43A2E` — losses, failed payment, revoked mandate.
- **Caution Amber** `#A8741C` — pending, attention, KYC-required.

Both signals are tuned to be readable on Ivory at 12px and on Ink at 14px and meet WCAG AA on both.

**Type.** A two-family system.

- **Display + UI:** *Söhne* (commercial) — substituted with **Inter** in this kit (closest open-source neutral grotesque). Weights 400/500/600. Used for nav, body, numbers, buttons, labels.
- **Editorial:** *Tiempos Headline* (commercial) — substituted with **Source Serif 4** (closest open-source transitional serif). Weights 400/600. Used for landing-page headlines, fund names on detail pages, and quote callouts.
- **Tabular numbers:** Inter with `font-feature-settings: "tnum" 1, "lnum" 1`. Mandatory anywhere a column of numbers stacks (tables, ledgers, charts).

Display sizes are restrained — institutional wealth pages don't shout. Hero is 56–72px on web, 32px on mobile. Body is 16px web / 15px mobile.

**Spacing.** A 4px base scale: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 · 80 · 120`. Dense screens (transaction lists, ledger views) use 12/16; landing pages breathe at 56/80/120.

**Backgrounds.** Mostly flat Ivory or Ink. **No gradients** in product chrome; one allowed exception is a subtle `Ink → Ink+2%` linear gradient on the website hero behind the Sensex/Nifty pulse strip. **No textures**, **no patterns**, **no hand-drawn illustrations**. The only repeating visual motif is a thin **rule line** (1px, slate-at-12%-opacity) used to delineate sections; the brand mark itself uses a single horizontal rule beneath the wordmark as its only ornament.

**Imagery.** When needed: monochrome editorial photography — wide architectural interiors, paper-document close-ups, hands at a desk. Cool tone, never warm Instagram-sun. Never stock-photo handshakes, never people pointing at laptops. Charts are the primary "image" — treat them with the same care as photographs.

**Animation.** Sparse. The product should feel **steady**, not playful.
- Standard transition: `200ms cubic-bezier(0.2, 0, 0, 1)` (out-quart). No bounce, no overshoot, ever.
- Page/route transitions: 160ms cross-fade, no slide.
- Number tickers (Sensex/Nifty): roll digits at 400ms with ease-out, no flash.
- Loading: a 1px gold progress bar at the top of the screen, never spinners-on-cards.
- Charts: animate from 0 on first paint at 600ms ease-out; subsequent updates are instantaneous.

**Hover states.** On light surfaces, links darken to Ink; on dark surfaces, they lift to Ivory. Buttons darken by ~6% (computed via oklch lightness). No glow, no shadow lift, no scale.

**Press states.** Buttons drop ~3% in lightness and shrink 1px via inset shadow rather than transform — this keeps adjacent layout stable. Cards do not press (they're not buttons).

**Borders.** 1px, slate at 16% opacity. Cards on Ivory get a 1px border *and* a 1px inset highlight on top in 50% Bone — a subtle bevel that reads as "paper". Inputs get a 1px border that thickens to 1.5px Ink on focus, never a colored ring.

**Shadows.** Two-step elevation system, kept tight. Long-throw soft shadows are banned — they read as web-app, not institutional.
- `shadow-1` (cards): `0 1px 2px rgba(14,17,22,0.06), 0 1px 1px rgba(14,17,22,0.04)`
- `shadow-2` (modals, popovers): `0 8px 24px rgba(14,17,22,0.12), 0 2px 6px rgba(14,17,22,0.06)`
- Inset highlight on cards: `inset 0 1px 0 rgba(255,255,255,0.6)`

**Corner radii.** Conservative. `4px` for inputs, badges, small chips. `8px` for buttons, cards, sheets. `12px` for modals and the bottom-sheet on mobile. **No fully-rounded pills** except for state badges (ACTIVE / PAUSED) which use `999px` to read as system-status. Avatars are `999px`. Charts and chart legends never have rounded corners.

**Cards.** A card is `bg: Bone`, `border: 1px slate-16%`, `radius: 8px`, `shadow-1`, `padding: 20px` (24px on web). Cards never carry colored left-borders, colored shadows, or gradient fills. A card's title is 14px medium uppercase eyebrow + 18px serif headline + body. Money values inside cards are 28–32px tabular.

**Transparency & blur.** Used in exactly two places: (1) the website's sticky top nav, which becomes `Ivory at 80% + 12px backdrop-blur` once scrolled; (2) the APK's bottom-tab bar, which is `Ink at 92% + 16px backdrop-blur` on iOS-style and solid Ink on Android-style. Nowhere else.

**Layout rules.**
- Web max-width is `1200px` for marketing, `1320px` for the admin console (denser data).
- Web grid: 12-col, 24px gutter, 24px outer margin (32px ≥1024px).
- APK is a single column, 16px outer padding, 12px inner card spacing.
- Sticky elements: web top nav (60px), APK top app bar (52px), APK bottom nav (64px + safe area). The market-pulse strip is **not** sticky — it lives in the page header, not pinned, to avoid distracting from the dashboard's portfolio number.
- On any "money screen", the source+timestamp footer is fixed to the bottom of the content block, never to the viewport.

**Charts.** A house style, applied across all surfaces.
- Single-line performance: 1.5px stroke, Ink. Drawdown band is Signal Red at 8% fill. Benchmark overlay is Slate dashed (4 4).
- Allocation rings: 12px stroke, gap of 2deg between segments. Series colors are Ink, Slate, Gold, plus tints — never rainbow.
- Axis labels: 11px Inter, Slate. Y-axis on the right (matches Indian financial-press convention). X-axis ticks every 6mo on 5yr/10yr charts.
- No 3D, no glow, no shadows on chart elements.

**Iconography.** See ICONOGRAPHY below.

---

## ICONOGRAPHY

BeOnEdge uses **Lucide** as its icon system — a lightweight open-source line set with consistent 1.5px strokes, square caps, round joins, and a 24×24 viewBox. Lucide reads as institutional and editorial rather than playful (compared to e.g. Material's filled set or Font Awesome). It's loaded from CDN in this kit:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
```

**Substitution flag:** Lucide is a *substitution*. BeOnEdge does not yet have a proprietary icon set; if/when a custom set is commissioned, replace the CDN reference and update this section. Until then, use Lucide as the source of truth and do not mix in icons from other libraries.

**Usage rules.**
- Stroke icons only. Never filled.
- Sizes: 16px (inline with body text), 20px (nav, table rows), 24px (primary affordances, app bar), 32px+ (illustrative use only — empty states, onboarding).
- Color: inherits `currentColor`. Default Ink on light, Ivory on dark. Slate for secondary affordances. Gold for the brand mark and exactly one CTA per screen at most.
- Stroke width is fixed at the Lucide default (`stroke-width: 1.5`). Do not thicken icons to "balance" with bold text.
- Pair icons with labels in nav and primary buttons. Icon-only buttons require a tooltip and an aria-label.

**Logos & brand marks.** The BeOnEdge wordmark is set in Source Serif 4 SemiBold, Ink color, with a single 1px gold rule beneath. The mark is the wordmark + rule, never the rule alone. See `assets/logo.svg` and `assets/logo-mark.svg`.

**Emoji.** Never used in product UI. Allowed in admin internal notes only (admin audit log narration).

**Unicode characters.** Used sparingly for currency (₹), arrows (→ ↗ ↘), and bullet (·). Never as decorative icons.

**Photographic illustration.** The system ships no illustrative images by default — designs that need an image should source from the brand library (not yet provided). Until then, use `assets/placeholder-photo.svg` (a thin-rule placeholder) and flag the gap.

---

## Caveats & next steps

1. **No codebase or Figma was attached.** Every visual choice is extrapolated from the PRD's design direction. Please attach the brand kit / Figma / codebase so this system can be reconciled.
2. **Fonts are Google Fonts substitutes:** Inter substitutes for Söhne; Source Serif 4 substitutes for Tiempos. If BeOnEdge has licensed display faces, drop the `.woff2` files into `fonts/` and update `colors_and_type.css`.
3. **Logo is placeholder.** A wordmark in the substitute serif. Replace `assets/logo.svg` with the official mark.
4. **Iconography is Lucide via CDN** — flagged as a substitution.
5. **No imagery.** No editorial photography is included; the photo placeholder is a thin-rule SVG.

See SKILL.md for agent usage.
