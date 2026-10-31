# Customer self-service portal integration

## Current backend profile endpoint

The backend now mounts authenticated `GET /api/customers/me` and `PUT /api/customers/me`. The read returns the signed-in CUSTOMER account's `id`, `email`, `role`, and optional saved `name`; the update accepts only `{ "name": "..." }`, creating or updating that account's Customer profile. Updates require the session, matching CSRF cookie/header, and trusted Origin. Email and role are intentionally not editable through this endpoint. This profile endpoint does not provide billing subscriptions, invoices, payments, or dashboard totals.

## Verified scope

Inspected main through `6d8f9ff` and the existing P0 audit. The backend mounts auth/products only. `/auth/me` still omits the real User.id. Its newer Origin/product fixes do not supply customer billing reads. No auth acceptance rules were relaxed. Complete sessions in portal tests are test fixtures, not evidence that real login now works.

The CUSTOMER AppShell mounts `/portal/home`, `/portal/subscriptions` and `/portal/subscriptions/:id`. Home metrics remain unavailable, not zero; no business-wide report or paginated-list aggregation is used. Subscription views deliberately do not fetch internal records or accept an account_id query as proof of ownership. Pause/close/renew stay disabled. No customer record is invented.

## Required backend ownership contracts

Use the existing architecture paths, not new speculative `/portal` or `/me/subscriptions` API routes:

- `GET /api/subscriptions` and `GET /api/subscriptions/{id}` must authenticate the principal and constrain repository reads by the CUSTOMER session's billing account. Ignore/reject attempted cross-account filters. Return only customer-safe plan/status/date/amount fields, integer minor units/currency and the agreed paginated envelope.
- For list and detail, test two real accounts: A cannot read B's records by changing IDs, filters or pagination. Return 404 (or agreed 403) without disclosing record existence. Validate ownership before serializing relations; do not expose internal activity or other customers through nested links.
- Subscription reads are own-account read-only by default. No customer lifecycle action is enabled until an explicit customer policy/capability and mutation DTO, CSRF/Origin and server eligibility enforcement are confirmed. The internal transition example is not customer authorization.
- Home needs an explicitly authorized customer summary projection for active count, next renewal and outstanding balance. Its path/DTO is not documented, so no request is guessed. Recent invoices need a supported scoped sort/limit contract. Never substitute business-wide `/api/reports/summary` or totals calculated from one page.
- `/api/auth/me` must return the actual User.id alongside role/account_id/email and server-issued CSRF. No cached registration ID or account_id substitution.

Backend ownership enforcement and successful owned/cross-account reads are **unverified**, not implemented by a client-side filter. Current tests prove the frontend makes no unverified data requests; they do not prove backend isolation. Loading/error/permission handling remains at the existing protected-session boundary until a safe billing request can be enabled. A missing contract is presented as unavailable rather than a fake empty response.

## Invoice and account experience

`/portal/invoices` and `/portal/invoices/:id` are CUSTOMER-only and read-only. Navigation is enabled on desktop/mobile. Invoice detail IDs do not trigger any request while ownership contracts are absent. Print is disabled with an explanation; no blank page, fabricated financial document or success is printed. No confirm/cancel/send/manual payment controls are mounted. Payment history is unavailable rather than falsely empty.

`/portal/account` still displays only authenticated session email/role/account_id; it has not yet been wired to `/api/customers/me`. Password and email changes remain unavailable; no pretend reset delivery is shown. ADMIN/STAFF continue to redirect to their own workspace when opening portal routes.

Additional backend dependencies:

- `GET /api/invoices` and `/api/invoices/{id}`: principal-scoped list/detail with stable pagination and customer-safe immutable invoice/bill-to/line/discount/tax/currency/settlement fields. Confirm list status visibility (especially DRAFT/CANCELLED). Test cross-account IDs and nested subscription/payment relations. No current-catalog joins may replace historical snapshot prices.
- `GET /api/invoices/{id}/payments`: enforce invoice ownership first, return agreed customer-safe amount/method/date/reference/note projections. Internal actor/reconciliation metadata must not leak. No global payment listing is required or invented.
- Browser printing must use the same authorized snapshot (or documented ownership-checked `/api/invoices/{id}/print`). The operational InvoiceDocument currently includes internal customer/subscription links and its Print control is ADMIN/STAFF-only. It is deliberately not mounted or granted CUSTOMER permission here. Extract a customer-safe document only after the customer DTO is confirmed; reuse formatters/status/table styles without exposing operational actions.
- Password and email changes still need explicit secure endpoints, payloads and verification policy before enabling those changes.

Remaining acceptance work is blocked: actual owned lists/details, successful empty/error read states, server aggregates, payment history, financial snapshot rendering/printing and real two-account isolation tests. No test fixtures are wired into production and no passing frontend test should be read as proof of these backend behaviors.

## Validation

`npm.cmd run typecheck` passed; `npm.cmd test -- --reporter=dot` passed **441 tests in 29 files**, including 26 new portal tests. `npm.cmd run build` passed with the existing Vite large-chunk advisory. Tests exercise CUSTOMER routes, session loading/error/permission/missing-ID gates, internal/portal role boundaries, manipulated detail IDs making no unsafe requests, account remounts, disabled mutations/printing and desktop/mobile navigation. They deliberately do not fabricate successful owned-record or snapshot responses under an unconfirmed contract.
