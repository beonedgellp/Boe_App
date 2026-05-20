# T11 Route Inventory

Generated: 2026-05-05T06:27:30.253Z

Total routes: 102

| Method | Path | Group | Auth Required | Roles Allowed | Description |
|--------|------|-------|---------------|---------------|-------------|
| DELETE | `/v1/admin/faqs/:faq_id` | admin | Yes | admin | Delete an FAQ. |
| DELETE | `/v1/admin/funds/:fund_id` | admin | Yes | admin | Delete fund pool. |
| GET | `/v1/admin/app-config` | admin | Yes | admin | Published mobile app component and content configuration. |
| GET | `/v1/admin/approvals` | admin | Yes | admin | Admin user approval queue. |
| GET | `/v1/admin/audit-logs` | admin | Yes | admin | Admin audit log search. |
| GET | `/v1/admin/capital-transactions` | admin | Yes | admin | List capital transactions. |
| GET | `/v1/admin/faqs` | admin | Yes | admin | Admin FAQ list. |
| GET | `/v1/admin/funds` | admin | Yes | admin | Admin fund catalogue with analytics. |
| GET | `/v1/admin/funds/:fund_id` | admin | Yes | admin | Get single fund detail (admin view). |
| GET | `/v1/admin/kyc-review` | admin | Yes | admin | KYC review queue. |
| GET | `/v1/admin/mandates` | admin | Yes | admin | Mandate operations list. |
| GET | `/v1/admin/notifications` | admin | Yes | admin | Admin notification list. |
| GET | `/v1/admin/overview` | admin | Yes | admin | Admin dashboard counts and summary stats. |
| GET | `/v1/admin/payments` | admin | Yes | admin | Payment reconciliation queue. |
| GET | `/v1/admin/products` | admin | Yes | admin | Admin strategy catalogue. |
| GET | `/v1/admin/receipts` | admin | Yes | admin | Admin receipt search with filters. |
| GET | `/v1/admin/redemption-requests` | admin | Yes | admin | List user redemption requests. |
| GET | `/v1/admin/sip-control-requests` | admin | Yes | admin | SIP control request queue. |
| GET | `/v1/admin/support/tickets` | admin | Yes | admin | Support ticket queue. |
| GET | `/v1/admin/users` | admin | Yes | admin | Admin user list. |
| GET | `/v1/admin/users/:user_id/detail` | admin | Yes | admin | Get comprehensive user detail. |
| GET | `/v1/admin/users/:userId/timeline` | admin | Yes | admin | Admin view of user timeline. |
| PATCH | `/v1/admin/app-config` | admin | Yes | admin | Publish mobile app component and content configuration. |
| PATCH | `/v1/admin/faqs/:faq_id` | admin | Yes | admin | Update an FAQ. |
| PATCH | `/v1/admin/funds/:fund_id` | admin | Yes | admin | Update fund pool. |
| PATCH | `/v1/admin/kyc-review/:user_id` | admin | Yes | admin | Review KYC profile. |
| PATCH | `/v1/admin/mandates/:mandate_id` | admin | Yes | admin | Admin mandate state action. |
| PATCH | `/v1/admin/products/:product_id` | admin | Yes | admin | Update strategy draft or status. |
| PATCH | `/v1/admin/redemption-requests/:request_id` | admin | Yes | admin | Approve or reject a redemption request. |
| PATCH | `/v1/admin/sip-control-requests/:request_id` | admin | Yes | admin | Review SIP control request. |
| PATCH | `/v1/admin/users/:user_id/status` | admin | Yes | admin | Change user approval/status. |
| POST | `/v1/admin/faqs` | admin | Yes | admin | Create a new FAQ. |
| POST | `/v1/admin/funds` | admin | Yes | admin | Create fund record. |
| POST | `/v1/admin/funds/:fund_id/allocate` | admin | Yes | admin | Allocate cash to an investment. |
| POST | `/v1/admin/funds/:fund_id/inflow` | admin | Yes | admin | Add capital to the fund pool. |
| POST | `/v1/admin/funds/:fund_id/outflow` | admin | Yes | admin | Withdraw funds from the pool (external outflow). |
| POST | `/v1/admin/funds/:fund_id/unallocate` | admin | Yes | admin | Unallocate funds from an investment back to cash. |
| POST | `/v1/admin/notifications` | admin | Yes | admin | Send notification to users. |
| POST | `/v1/admin/payments/:payment_id/reconcile` | admin | Yes | admin | Reconcile payment with reason. |
| POST | `/v1/admin/products` | admin | Yes | admin | Create strategy draft. |
| POST | `/v1/admin/products/:product_id/disclosures` | admin | Yes | admin | Publish strategy disclosure. |
| POST | `/v1/admin/products/:product_id/holdings` | admin | Yes | admin | Upload strategy holdings. |
| POST | `/v1/admin/products/:product_id/nav` | admin | Yes | admin | Upload strategy NAV. |
| POST | `/v1/admin/support/tickets/:ticket_id/reply` | admin | Yes | admin | Reply to a support ticket. |
| GET | `/v1/auth/session` | auth | No | — | Return current session status when a bearer token is present. |
| POST | `/v1/auth/login` | auth | No | — | Create an access/refresh token pair after approved-user checks. |
| POST | `/v1/auth/logout` | auth | Yes | client, admin | Revoke the active device session. |
| POST | `/v1/auth/refresh` | auth | No | — | Rotate a refresh token and return a fresh access token. |
| POST | `/v1/auth/signup` | auth | No | — | Create a simple client account from website signup. |
| GET | `/v1/client/dashboard` | client | Yes | client, admin | Client portfolio dashboard. |
| GET | `/v1/client/kyc-status` | client | Yes | client, admin | Client KYC status. |
| GET | `/v1/client/mandates` | client | Yes | client, admin | Client UPI AutoPay mandates. |
| GET | `/v1/client/mandates/:mandate_id` | client | Yes | client, admin | Client mandate detail. |
| GET | `/v1/client/me/timeline` | client | Yes | client, admin | Current user timeline events. |
| GET | `/v1/client/me/timeline/next-step` | client | Yes | client, admin | Next-step text for current money state. |
| GET | `/v1/client/notifications` | client | Yes | client, admin | Client notifications. |
| GET | `/v1/client/orders` | client | Yes | client, admin | Client investment plan and order list. |
| GET | `/v1/client/orders/:order_id` | client | Yes | client, admin | Client order/transaction status. |
| GET | `/v1/client/payments` | client | Yes | client, admin | Client payment list filtered by status. |
| GET | `/v1/client/payments/:payment_id` | client | Yes | client, admin | Client payment status. |
| GET | `/v1/client/portfolio` | client | Yes | client, admin | Client portfolio detail. |
| GET | `/v1/client/portfolio/holdings/:fund_id` | client | Yes | client, admin | Single client holding detail. |
| GET | `/v1/client/receipts` | client | Yes | client, admin | List receipts for the current user. |
| GET | `/v1/client/receipts/:receiptId` | client | Yes | client, admin | Get a single receipt by ID. |
| GET | `/v1/client/redemptions` | client | Yes | client, admin | List client redemption requests. |
| GET | `/v1/client/research-context` | client | Yes | client, admin | Published allocation/research context for client education. |
| GET | `/v1/client/sip-control-requests` | client | Yes | client, admin | Client SIP control request list. |
| GET | `/v1/client/statements` | client | Yes | client, admin | Client generated statements. |
| GET | `/v1/client/statements/:statement_id` | client | Yes | client, admin | Client statement detail. |
| GET | `/v1/client/support/faqs` | client | Yes | client, admin | Client support FAQ list. |
| GET | `/v1/client/support/tickets` | client | Yes | client, admin | Client support ticket list. |
| GET | `/v1/client/support/tickets/:ticket_id` | client | Yes | client, admin | Client support ticket detail with messages. |
| GET | `/v1/client/transactions` | client | Yes | client, admin | Client transaction ledger. |
| GET | `/v1/client/transactions/:transaction_id` | client | Yes | client, admin | Client transaction detail. |
| GET | `/v1/client/withdrawals/preview` | client | Yes | client, admin | Preview withdrawal with tax assumptions. |
| GET | `/v1/products` | client | Yes | client, admin | Approved-client strategy list. |
| GET | `/v1/products/:product_id` | client | Yes | client, admin | Approved-client strategy detail. |
| GET | `/v1/system/reachability` | client | No | — | Client app reachability and minimum version. |
| PATCH | `/v1/client/notifications/:notification_id` | client | Yes | client, admin | Mark a notification read or update client notification state. |
| POST | `/v1/client/kyc-depth` | client | Yes | client, admin | Update FATCA, nominee, and re-KYC depth data. |
| POST | `/v1/client/lumpsum-orders` | client | Yes | client, admin | Create a one-time investment order. |
| POST | `/v1/client/mandates/:mandate_id/authorize` | client | Yes | client, admin | Start or continue mandate user authorization. |
| POST | `/v1/client/orders/:order_id/pay-pending-installment` | client | Yes | client, admin | Retry a pending SIP installment. |
| POST | `/v1/client/payments/:payment_id/retry` | client | Yes | client, admin | Retry a failed or expired payment. |
| POST | `/v1/client/redemptions` | client | Yes | client, admin | Create a redemption request. |
| POST | `/v1/client/sip-control-requests` | client | Yes | client, admin | Request SIP pause, skip, step-up, change, or cancel. |
| POST | `/v1/client/sips` | client | Yes | client, admin | Create a SIP investment plan. |
| POST | `/v1/client/support/tickets` | client | Yes | client, admin | Create a support ticket. |
| POST | `/v1/client/withdrawals` | client | Yes | client, admin | Create a redemption request from a preview. |
| GET | `/v1/internal/routes` | internal | Yes | admin | Registered route metadata for operations tooling. |
| POST | `/v1/webhooks/mandates/:provider` | provider-webhook | No | — | Mandate provider webhook receiver. |
| POST | `/v1/webhooks/payments/:provider` | provider-webhook | No | — | Payment provider webhook receiver. |
| GET | `/health` | public | No | — | Process health and runtime configuration warnings. |
| GET | `/v1/app-config` | public | No | — | Published mobile app component and content configuration. |
| GET | `/v1/health` | public | No | — | Versioned process health. |
| GET | `/v1/public/disclosures` | public | No | — | Published strategy disclosures. |
| GET | `/v1/public/grievance` | public | No | — | Grievance redressal process and escalation matrix. |
| GET | `/v1/public/investor-charter` | public | No | — | SEBI-mandated investor charter. |
| GET | `/v1/public/products` | public | No | — | Public strategy catalogue. |
| POST | `/v1/onboarding/applications` | public | No | — | Submit a website onboarding application. |
| POST | `/v1/onboarding/kyc-documents` | public | No | — | Register KYC document references for review. |
| POST | `/v1/onboarding/risk-profile` | public | No | — | Submit onboarding risk profile answers. |

No duplicate routes found.
