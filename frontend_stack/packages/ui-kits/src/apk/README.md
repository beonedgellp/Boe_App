# BeOnEdge — Client APK Kit

Daily mobile experience for approved clients. Login-only. Mobile-first 412px viewport.

## Screens covered
- Splash (Ink background, gold progress bar).
- Login.
- Dashboard: greeting, portfolio value card, active SIP, quick actions, market pulse.
- Explore: fund shelf with Growth Fund (Open) and two Coming Soon products.
- Fund detail: NAV header, 5Y/10Y performance chart with drawdown band, allocation ring, top holdings, sticky action bar.
- Start SIP bottom sheet: amount + duration + debit-day chips, summary, mandate notice.
- Transactions: tabbed list with state badges.
- Profile: KYC, risk profile, mandates, settings, sign-out.

## Components (`Components.jsx`)
- `ApkAppBar`, `ApkBottomNav`
- `ApkSplash`, `ApkLogin`
- `ApkDashboard`, `ApkExplore`, `ApkFundDetail`
- `ApkStartSipSheet`
- `ApkTransactions`, `ApkProfile`

## Open
`ui_kits/apk/index.html` shows all screens side-by-side in phone bezels. The third frame is interactive — tap **BeOnEdge Growth Fund** to open the detail page; tap **Start SIP** to see the bottom sheet.
