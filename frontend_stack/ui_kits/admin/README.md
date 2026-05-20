# BeOnEdge — Admin Console Kit

Internal back-office for ops, fund management, and money operations. Desktop-first dense UI.

## Screens covered
- **User approvals** — pending queue with KYC flags, bulk actions.
- **Fund CMS** — performance preview chart, allocation, holdings, fund catalog table with status badges (Published / Coming soon / Draft).
- **Payments** — 24h ledger, status badges (success / pending / failed / reconciled).
- **Mandates** — active register with pause/revoke actions.

Sidebar lists all admin areas; only the four above are wired in this demo. Click any sidebar item to switch.

## Components (`Components.jsx`)
- `AdminSidebar` (grouped nav, env badge, user chip)
- `AdminTopBar` (breadcrumbs + serif title)
- `StatTile` (KPI card)
- Screens: `ApprovalsScreen`, `FundsScreen`, `PaymentsScreen`, `MandatesScreen`

## Visual notes
- Sidebar uses Ink background (the only place dark mode appears) so admins always know they're in privileged surface.
- Tables: monospace IDs, tabular numerics, mono uppercase column heads.
- Status badges share the same vocabulary as the public site and APK.

## Open
`ui_kits/admin/index.html` — click sidebar items to navigate the wired screens.
