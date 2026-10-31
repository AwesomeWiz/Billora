# P0 frontend–backend integration checkpoint — 31 October 2026

## Evidence and scope

Live Uvicorn HTTP and real Edge/Vite tests exercised the checked-in backend from `9fac2c7`. Later fetched `origin/main` updates through `d08646e` add Abiya's Discounts and quotation-template modules; `git diff 9fac2c7 d08646e -- backend` is empty. The frontend authentication fix was safely rebased onto both updates without conflicts. No backend code, database dependencies, roles, auth responses or browser requests were patched/mocked in these live checks. Existing invoice/payment/report/Plans commits and the unrelated untracked root package-lock.json are preserved.

The audit runs against a fresh temporary SQLite database with real committed records, not an existing development/production database. Runtime dependencies were installed into a disposable environment from backend/requirements.txt: Python 3.13, FastAPI 0.162.0, Pydantic 2.14.2, SQLAlchemy 2.1.6, Uvicorn 0.54.0 and HTTPX 0.28.1. Backend requirements are unpinned; these are the tested versions, not new repository dependency changes. Real Edge used the same-origin Vite proxy on a temporary port 5174 because an existing server occupied 5173; that server was left untouched. Audit-owned processes were stopped afterward. No credentials or token/cookie values appear in this handoff.

**WORKING** means the stated behavior was observed, not that the entire feature is complete. **CONTRACT_MISMATCH** includes incompatible shapes/routes or failed security expectations. **BACKEND_MISSING** means the runtime route is absent from OpenAPI and its documented reads return 404. **UNVERIFIED** means there is insufficient real authorized end-to-end evidence. Frontend unit fixtures do not change these classifications.

## Current integration matrix

| Integration | Status | Runtime evidence and frontend result |
| --- | --- | --- |
| Anonymous CSRF bootstrap | WORKING | `GET /api/auth/csrf` → 200 `{csrf_token}` with cookie. Frontend now uses this verified route after anonymous `/me` 401. It does not create identity or fabricate a token. |
| Customer registration | WORKING | Cookie + X-CSRF-Token + `{email,password}` → 200 `{account_id,user_id,role:"CUSTOMER"}`; duplicate → 409. Real Edge registration persists a customer and redirects to `/login`, without claiming a session. |
| Login HTTP/cookie issuance | WORKING | CSRF-protected email/password POST → 200 `{detail:"logged in"}` and opaque HttpOnly session cookie. Response detail is not used as identity. |
| Session identity / full frontend login | CONTRACT_MISMATCH | `/me` → 200 `{user:{account_id,email,role},csrf_token}`; **user.id is missing**. Frontend refuses account-ID substitution and remains on `/login` with unverified sign-in error. |
| Backend cookie persistence | WORKING | A fresh HTTP client and browser reload retain the session; `/me` continues to return 200. Cookie persistence does not repair the identity DTO. |
| Authorized frontend redirects / refresh | UNVERIFIED | Real CUSTOMER login cannot reach `/portal/home`; refresh correctly shows `Unable to verify your session`. No genuine ADMIN/STAFF identities were provisioned or elevated for this audit. Existing role-routing tests use test-only complete sessions. |
| Logout HTTP/revocation | WORKING | Valid CSRF POST → 200 `{detail:"logged out"}`, both cookies removed, `/me` → 401, replay of the **current revoked cookie** → 401. Real browser-context API logout also returns 200 and a protected refresh redirects to login. |
| AppShell sign-out button with real complete identity | UNVERIFIED | AppShell cannot open until `/me` returns user.id. Provider tests cover confirmed versus failed logout; no live button success is claimed. |
| Auth CSRF rejection | WORKING | Missing header → 422; wrong header → 403 for register/login or logout checks. Frontend always retains cookie credentials and mandatory mutation header. |
| Trusted Origin / CSRF rotation and binding | CONTRACT_MISMATCH | A login carrying an untrusted Origin plus valid cookie/token returns 200. Source has no Origin check or session-bound CSRF hash/rotation. This is a policy gap; this probe alone does not establish a cross-site browser exploit. |
| Password recovery / staff provisioning | BACKEND_MISSING | No forgot/reset/staff routes or schemas in runtime OpenAPI. Recovery remains unavailable; no email success or role provisioning is invented. |
| Products list / catalog module | CONTRACT_MISMATCH | Frontend `GET /api/products` → 405 `{detail:"Method Not Allowed"}`. There is only POST on that collection path. Product reads/creation do not make the list work. |
| Product/variant authorization and CSRF | CONTRACT_MISMATCH | A real CUSTOMER cookie, **without X-CSRF-Token**, creates a product and variant (201). An anonymous product detail read returns 200 including cost_price_minor. Internal catalog security expectations fail. |
| Variants transport / DTO | CONTRACT_MISMATCH | Frontend nested `GET /products/{id}/variants` → 404. Backend actually exposes POST `/products/variants` with name/price_adjust_minor/product_id and GET `/products/variants/{id}`. No nested list/PATCH/DELETE exists. |
| Plans | BACKEND_MISSING | `GET /api/plans` → 404; no plan paths/schema. Abiya's route/UI is integrated, but it is not a working backend plan service. |
| Customers | BACKEND_MISSING | `GET /api/accounts` and the registered account detail → 404. Auth Account contains email/role rather than the billing display_name/billing_email DTO. |
| Subscriptions / lifecycle | BACKEND_MISSING | Subscription reads → 404 and transition route absent from OpenAPI. No real plan/policy/transition result exists. No additional transition was enabled in this checkpoint. |
| Invoice list/details | BACKEND_MISSING | Invoice reads → 404; no invoice models/DTOs/routes. Existing snapshot UI handles unavailable data without substitute records. |
| Invoice confirm/cancel/send/print service | BACKEND_MISSING | No action/print routes in runtime OpenAPI. Unknown financial POST bodies were not guessed or sent. Confirm/cancel/send submission stays disabled. Local snapshot browser printing is separate and has not printed a real invoice. |
| Payment history/recording | BACKEND_MISSING | History GET → 404; POST payment route/schema/method enum absent. Recording remains disabled. Preparation IDs are not payment IDs, posted idempotency keys or evidence of settlement. |
| Financial overview / overdue reporting | BACKEND_MISSING | Both report GETs → 404. Validated frontend metrics/pages exist, but no real aggregates, date filters or charts are claimed. |
| Taxes/discounts/quotations and remaining configuration | BACKEND_MISSING | Auth/product are the only mounted domains in OpenAPI. Teammate modules and their dependency notes remain untouched; no missing module was enabled here. |

## Exact authentication behavior and fix

Frontend requests `/auth/me` first. Only its anonymous 401 triggers the verified `/auth/csrf` GET, whose nonempty JSON token is validated before retaining it in memory. Bootstrap alone never authenticates. 403/5xx/malformed session responses are not disguised as anonymity; malformed/bootstrap failures keep writes unavailable. Cancelled bootstrap cannot overwrite a newer token. Valid authenticated sessions still use `/me`'s token directly.

Live headers: session cookie name `session_token`, HttpOnly, SameSite=Lax, Path=/, Max-Age=3600; Secure=false on local HTTP. CSRF is a separate `csrf_token` cookie. The current double-submit check is observed; server-side session binding/rotation, trusted-Origin policy and HTTPS/cache/lifetime behavior require backend work. Frontend continues credentials:include, no bearer fallback, no auth secret storage and no automatic write retries.

Actual live `/me` (identifiers/token omitted here):

```json
{"user":{"account_id":"<account UUID>","email":"<test email>","role":"CUSTOMER"},"csrf_token":"<server-issued value>"}
```

Required compatible identity is the architecture's existing envelope, **not a frontend-invented identity mapping**:

```json
{"user":{"id":"<User.id>","account_id":"<User.account_id>","email":"<Account.email>","role":"CUSTOMER"},"csrf_token":"<current session-bound value>"}
```

Adithya already has the real User from get_current_user and returns its ID on registration. Publish a typed session DTO and return that actual user ID on `/me`; do not ask the frontend to reuse account_id or cached RegisterOut data. Confirm ADMIN/STAFF role provisioning separately. The frontend did not relax parseSession or modify any backend code.

## Persisted workflow result

**Customer → Product → Plan → Subscription → Invoice → Payment → Dashboard: NOT COMPLETE.**

1. Real HTTP registration and Edge registration committed two CUSTOMER accounts/users in the disposable SQLite database.
2. Login issued cookies and three sessions across the HTTP/browser probes. **First legitimate workflow blocker: `/me` lacks user.id, so the frontend cannot establish a verified actor or redirect into its protected portal/workspace.**
3. Independent negative security probes committed one product and one variant using a CUSTOMER cookie without CSRF. These are security failures in isolated test data, not a legitimate successful internal billing workflow. No roles were inserted/promoted and no privileged session was forged.
4. The next domain blocker is catalog list/variant route+DTO/security mismatch; Plan then returns 404. Subscription, invoice, payment and dashboard routes remain absent. No real invoice/payment was produced, no aggregate revenue was verified and no financial write payload was invented.
5. A backend session survived fresh-client/browser reload, but protected frontend content remained closed. Direct API logout cleared/revoked the current session and protected refresh returned to login. No auth secrets were written to localStorage/sessionStorage in the real browser.

## Prioritized handoff for Adithya

| Priority | Endpoint / expected request | Actual response or missing contract | Frontend dependency / required backend action |
| --- | --- | --- | --- |
| P0.1 | GET `/api/auth/me`; cookie-authenticated | 200 but no `user.id` | Return typed `{user:{id,email,role,account_id},csrf_token}` with actual User.id; confirm real role redirects and protected refresh before claiming full auth. |
| P0.1 | POST/PATCH catalog; ADMIN-only configuration per PRD, CSRF mandatory | CUSTOMER POST without CSRF → 201. `require_role(user,"ADMIN","STAFF")` returns a checker which handlers never execute; checker also expects an attribute while current_user returns a dict. | Correct backend dependency invocation and role extraction; apply CSRF/Origin validation and role/cost-data rules. Coordinate Abiya's visible write controls with the confirmed server role policy, without editing her module here. |
| P0.1 | GET `/api/products` with the documented list/filter envelope | 405; no collection read | Implement list/search/filter/pagination and active/safe field projections. ProductOut also lacks the created_at required by the frontend. Product/cost schemas require >0 while frontend permits 0; agree nonnegative pricing policy rather than forcing a frontend alias. |
| P0.1 | GET/POST `/api/products/{id}/variants`; frontend attribute_name, attribute_value, price_delta_minor, active | Nested GET 404; backend POST `/products/variants` uses product_id/name/price_adjust_minor/notes with strictly positive adjustment | Agree the documented route/DTO or coordinate an explicit module contract change with Abiya. Supply nested history-safe list/update/deactivation semantics and signed/zero adjustment policy as agreed. Do not silently translate fields and enable writes. |
| P0.2 | GET/POST `/api/plans`, GET/PATCH `/api/plans/{id}` | GET 404; no DTO | Publish plan interval/base-fee/minimum/availability/policy flags using Abiya's existing API_DEPENDENCIES.md; server-authoritative billing policy needed before subscriptions. |
| P0.2 | GET `/api/accounts`, `/api/accounts/{id}` | 404 even for the real registered account | Publish billing identity (id/display_name/billing_email/address/currency), authorization and standard list envelope; settle auth Account vs billing-account association. |
| P0.2 | GET/POST subscriptions, detail and POST `/subscriptions/{id}/transition` | Reads 404; write DTOs/routes absent | Freeze subscription creation and lifecycle DTOs. Architecture illustrates ACTIVATE `{action:"ACTIVATE",reason}` only; agree other action inputs and exact state/policy/date results. No unknown write body was tested. |
| P0.3 | GET invoices and detail; POST confirm/cancel/send | Reads 404; mutation DTOs absent | Supply immutable bill-to/line/payment projections; expected revision/total validation on confirmation, once-only discount use, paid cancellation prohibition and truthful delivery outcomes. Existing PHASE3A/B notes specify the pending fields. |
| P0.3 | POST `/api/payments`, GET `/invoices/{id}/payments` | History 404; write route, complete method enum and result DTO absent | Architecture request is `{invoice_id,method,amount_minor,paid_at,note}` with Idempotency-Key, not proof of all methods/result fields. Publish exact payment ID/link/amount/status/paid/balance response; atomic role/state/no-overpay/idempotency guarantees and uncertain-outcome reconciliation are required before enabling submission. |
| P0.3 | GET `/api/reports/summary`, `/overdue` | Both 404 | Return documented summary counts/integer amounts/range/currency and agreed overdue projections/pagination. Define date-query/as-of semantics before filters. Verify values against committed invoices/payments, not frontend page sums. |
| P0.4 | Auth mutation trusted-Origin validation, session-bound CSRF, deployment cookie/cache policy | Untrusted-Origin valid-token login → 200; simple double-submit only in source | Agree and enforce Origin/Referer policy, rotate/bind tokens, align expiry policy and Secure on HTTPS. Do not weaken frontend CSRF to compensate. |
| P0.4 | Forgot/reset password, staff provisioning, tax/discount/quotation services | Absent from OpenAPI; payload/delivery agreements incomplete | Publish coordinated routes/DTOs, least-privilege access and real-vs-preview email outcomes. Do not enable placeholders. |

## Reproducing the live audit

The opt-in [live_backend_checkpoint.py](../tests/live_backend_checkpoint.py) starts the actual checked-in app with an isolated SQLite URL and PYTHONDONTWRITEBYTECODE; it does not modify backend files or seed privileged identities. It requires free loopback backend port 8000, installs nothing itself, refuses existing listeners, and stops only its own child processes. Browser mode uses installed Edge through Playwright and starts its own Vite instance; choose another frontend port if the user's 5173 is occupied.

From the repository root using a temporary Python environment with `backend/requirements.txt` and (for browser mode) `playwright` installed:

```powershell
<temporary-venv>\Scripts\python.exe frontend/src/tests/live_backend_checkpoint.py --browser --frontend-port 5174 --output <temporary-output-path>.json
```

The JSON sanitizes credentials/token fields and validation input, captures OpenAPI paths, actual statuses, cookie attributes, real browser refusal/redirect behavior and committed table counts. The script deliberately probes denied catalog writes **only in the disposable database**; a 201 is reported as a security failure, never a successful P0 workflow. Unknown financial POSTs are not sent. Temporary DB/log/output artifacts are not committed. No actual admin/staff success, reset email, money transfer, payment result or invoice delivery is claimed.

## Validation and changed files

Final validation after integrating remote main through `d08646e`:

- `npm.cmd run typecheck`: passed.
- `npm.cmd test -- --reporter=dot`: **406 tests passed in 26 files**. The new CSRF integration suite contains 17 cases. An earlier run alongside the build timed out on an existing payment-history test; its focused rerun and subsequent standalone full suites passed without weakening tests or changing timeouts.
- `npm.cmd run build`: passed. Build output remains ignored and uncommitted.
- Live HTTP/Edge audit: real registration, cookie issuance/persistence, CSRF rejection and logout/revocation observed; missing session identity and catalog security failures reproduced. Full P0 workflow remains blocked, not passed.
- Python audit syntax check: passed. Live audit dependencies were kept outside the repository.

Auth changes are limited to `features/auth/contract.ts`, `features/auth/service.ts`, `features/auth/INTEGRATION.md`, `tests/auth-checkpoint.test.tsx` and `tests/auth-csrf-integration.test.tsx`. This handoff and `tests/live_backend_checkpoint.py` complete the audit. No backend, shared contract, teammate feature module or financial mutation gate was changed. The unrelated root lockfile remains untouched and uncommitted.

Next milestone: Adithya fixes `/auth/me` identity plus catalog authorization/CSRF and list/variant contracts, then provides real ADMIN/STAFF test actors. Repeat the live checkpoint before enabling any newly supported workflow; proceed to Plans/accounts/subscriptions and immutable invoice/payment/report DTOs only as those backend contracts become available.
