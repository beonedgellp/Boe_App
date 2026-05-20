# T11 Smoke Test Results

Generated: 2026-05-05T06:57:16.326Z

Server: http://127.0.0.1:47502

## Summary

| Metric | Count |
|--------|-------|
| Total routes | 102 |
| Total checks | 386 |
| PASS | 386 |
| FAIL | 0 |
| BLOCKER | 0 |

## Per-Route Results

| Method | Path | Group | Auth | Roles | No-Auth | Client | Admin | Pending | Rejected |
|--------|------|-------|------|-------|---------|--------|-------|---------|----------|
| GET | `/health` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/health` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/system/reachability` | client | No | — | 200 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| POST | `/v1/auth/login` | auth | No | — | 400 PASS | 400 PASS | 400 PASS | — | — |
| POST | `/v1/auth/signup` | auth | No | — | 400 PASS | 400 PASS | 400 PASS | — | — |
| POST | `/v1/auth/logout` | auth | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | — | — |
| POST | `/v1/auth/refresh` | auth | No | — | 400 PASS | 400 PASS | 400 PASS | — | — |
| GET | `/v1/auth/session` | auth | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| POST | `/v1/onboarding/applications` | public | No | — | 501 PASS | 501 PASS | 501 PASS | — | — |
| POST | `/v1/onboarding/risk-profile` | public | No | — | 501 PASS | 501 PASS | 501 PASS | — | — |
| POST | `/v1/onboarding/kyc-documents` | public | No | — | 501 PASS | 501 PASS | 501 PASS | — | — |
| GET | `/v1/public/products` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/app-config` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/public/disclosures` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/public/investor-charter` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/public/grievance` | public | No | — | 200 PASS | 200 PASS | 200 PASS | — | — |
| GET | `/v1/client/dashboard` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/portfolio` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/portfolio/holdings/:fund_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 404 PASS | 404 PASS | 404 PASS |
| GET | `/v1/client/research-context` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/products` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/products/:product_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| POST | `/v1/client/sips` | client | Yes | client, admin | 401 PASS | 400 PASS | 403 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/lumpsum-orders` | client | Yes | client, admin | 401 PASS | 400 PASS | 403 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/orders` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/orders/:order_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 403 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/orders/:order_id/pay-pending-installment` | client | Yes | client, admin | 401 PASS | 400 PASS | 403 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/payments` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/payments/:payment_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 403 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/payments/:payment_id/retry` | client | Yes | client, admin | 401 PASS | 400 PASS | 403 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/mandates` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/mandates/:mandate_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 403 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/mandates/:mandate_id/authorize` | client | Yes | client, admin | 401 PASS | 400 PASS | 403 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/sip-control-requests` | client | Yes | client, admin | 401 PASS | 400 PASS | 400 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/sip-control-requests` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/transactions` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/transactions/:transaction_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 403 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/statements` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/statements/:statement_id` | client | Yes | client, admin | 401 PASS | 404 PASS | 404 PASS | 404 PASS | 404 PASS |
| GET | `/v1/client/notifications` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| PATCH | `/v1/client/notifications/:notification_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 403 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/kyc-status` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| POST | `/v1/client/kyc-depth` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/support/faqs` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/support/tickets` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| POST | `/v1/client/support/tickets` | client | Yes | client, admin | 401 PASS | 400 PASS | 400 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/support/tickets/:ticket_id` | client | Yes | client, admin | 401 PASS | 200 PASS | 403 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/withdrawals/preview` | client | Yes | client, admin | 401 PASS | 400 PASS | 400 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/withdrawals` | client | Yes | client, admin | 401 PASS | 400 PASS | 400 PASS | 403 PASS | 403 PASS |
| POST | `/v1/client/redemptions` | client | Yes | client, admin | 401 PASS | 400 PASS | 400 PASS | 403 PASS | 403 PASS |
| GET | `/v1/client/redemptions` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/admin/overview` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/users` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/approvals` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/kyc-review` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/products` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/payments` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/mandates` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/sip-control-requests` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/audit-logs` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/support/tickets` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| POST | `/v1/admin/support/tickets/:ticket_id/reply` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| GET | `/v1/admin/app-config` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| PATCH | `/v1/admin/app-config` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| GET | `/v1/admin/notifications` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| POST | `/v1/admin/notifications` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| GET | `/v1/admin/faqs` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| POST | `/v1/admin/faqs` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| PATCH | `/v1/admin/faqs/:faq_id` | admin | Yes | admin | 401 PASS | 403 PASS | 404 PASS | — | — |
| DELETE | `/v1/admin/faqs/:faq_id` | admin | Yes | admin | 401 PASS | 403 PASS | 404 PASS | — | — |
| GET | `/v1/admin/users/:user_id/detail` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| PATCH | `/v1/admin/users/:user_id/status` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| PATCH | `/v1/admin/kyc-review/:user_id` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| POST | `/v1/admin/products` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| GET | `/v1/admin/funds` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/funds/:fund_id` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| POST | `/v1/admin/funds` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| PATCH | `/v1/admin/funds/:fund_id` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| DELETE | `/v1/admin/funds/:fund_id` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| POST | `/v1/admin/funds/:fund_id/allocate` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| POST | `/v1/admin/funds/:fund_id/unallocate` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| POST | `/v1/admin/funds/:fund_id/outflow` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| POST | `/v1/admin/funds/:fund_id/inflow` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| GET | `/v1/admin/capital-transactions` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/admin/redemption-requests` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| PATCH | `/v1/admin/redemption-requests/:request_id` | admin | Yes | admin | 401 PASS | 403 PASS | 400 PASS | — | — |
| PATCH | `/v1/admin/products/:product_id` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| POST | `/v1/admin/products/:product_id/disclosures` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| POST | `/v1/admin/products/:product_id/nav` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| POST | `/v1/admin/products/:product_id/holdings` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| POST | `/v1/admin/payments/:payment_id/reconcile` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| PATCH | `/v1/admin/mandates/:mandate_id` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| PATCH | `/v1/admin/sip-control-requests/:request_id` | admin | Yes | admin | 401 PASS | 403 PASS | 501 PASS | — | — |
| POST | `/v1/webhooks/payments/:provider` | provider-webhook | No | — | 400 PASS | 400 PASS | 400 PASS | — | — |
| POST | `/v1/webhooks/mandates/:provider` | provider-webhook | No | — | 400 PASS | 400 PASS | 400 PASS | — | — |
| GET | `/v1/client/receipts` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/client/receipts/:receiptId` | client | Yes | client, admin | 401 PASS | 404 PASS | 404 PASS | 404 PASS | 404 PASS |
| GET | `/v1/admin/receipts` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/client/me/timeline` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/admin/users/:userId/timeline` | admin | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |
| GET | `/v1/client/me/timeline/next-step` | client | Yes | client, admin | 401 PASS | 200 PASS | 200 PASS | 200 PASS | 200 PASS |
| GET | `/v1/internal/routes` | internal | Yes | admin | 401 PASS | 403 PASS | 200 PASS | — | — |

## Failures and Blockers

No failures or blockers.

## Duplicate Route Check

No duplicate routes found.
