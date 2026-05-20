# T11 Route Smoke — Closure Summary

## Inventory
- **102 routes** documented across 6 groups (public, auth, client, admin, provider-webhook, internal)
- **Zero duplicate routes**
- Report: `reports/t11-route-inventory.md`

## Smoke Test Results
- **330 PASS** — auth, public, core read/write paths work correctly
- **39 FAIL** — categorized below, **none are critical bugs**
- **17 BLOCKER** — all are **known unimplemented stubs** returning 501

### FAIL Breakdown
| Category | Count | Explanation |
|---|---|---|
| Rejected-user reads | 20 | Rejected-status user with valid JWT gets 200 + empty data on read routes. Design decision: should rejected users be blocked from ALL client routes or just mutations? Currently only mutations enforce `USER_NOT_APPROVED`. |
| Admin → client resource | 10 | Admin user correctly gets 403 when trying to create/view client-specific resources (SIPs, orders, payments, mandates, tickets). Correct behavior. |
| Cross-user GET | 6 | User A getting 403 on user B's specific resources (orders/:id, payments/:id, mandates/:id, transactions/:id, tickets/:id). Correct ownership enforcement. |
| Pending → specific GET | 3 | Same as above but for pending user. Correct behavior. |

### BLOCKER Breakdown (all 501 stubs)
- Onboarding: `/v1/onboarding/applications`, `/v1/onboarding/risk-profile`, `/v1/onboarding/kyc-documents`
- Admin product CRUD: `POST /v1/admin/products`, `PATCH /v1/admin/products/:id`
- Admin product sub-resources: disclosures, NAV, holdings
- Admin operations: payment reconcile, mandate state change, SIP control review

## Frontend Dead-Link Check
- **All frontend `<Link>` / `<NavLink>` targets resolve** to declared routes
- **All 45 frontend `apiRequest()` calls** map to existing backend routes
- No orphan pages or uncallable APIs detected

## Artifacts
- `scripts/t11-route-inventory.js` — generates route inventory markdown
- `scripts/t11-smoke-test.js` — runs full matrix smoke test
- `reports/t11-route-inventory.md` — route table
- `reports/t11-smoke-test-results.md` — per-route results with response snippets
