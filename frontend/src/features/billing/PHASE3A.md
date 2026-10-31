# Phase 3A — read-only invoices

The invoice UI uses `docs/ARCHITECTURE.md` §4.2, §5.2/5.4 and §7.1/7.2. As inspected at `b801f15`, the backend mounts auth and product routers only; there are no invoice endpoints, Pydantic invoice schemas, OpenAPI artifacts or shared TypeScript contracts. Feature-local adapters are integration boundaries, not new agreed backend contracts. No backend, teammate feature, shared contract or completed Phase 1/2 behavior is rewritten.

## Invoice list

`/app/invoices` is under the existing ADMIN/STAFF guard. `GET /api/invoices` uses the standard `{items,total,page,page_size,has_next}` envelope and `page`, `page_size` (20/25/50), `sort=created_at_desc`, optional `search`, and canonical invoice `status`. The date filter is **exact due date**, sent as `due_on`, the invoice filter named in Architecture §10.1. Search/date apply on submission; status applies on selection. Filters and pagination are kept in the URL. Invalid status/date filters never trigger a broader unfiltered API request. Date-range/issued-date query parameter names are not specified and are not invented.

Core validated fields: `id`, `number`, `billing_account_id`, ISO `issued_on`, `due_on`, canonical `DRAFT|CONFIRMED|PAID|CANCELLED`, safe nonnegative integer `total_minor`, currency (INR default). Optional amounts remain unknown when omitted: `paid_minor`, `balance_minor`, `subtotal_minor`, `discount_minor`, `tax_minor`. No balance or missing amount is calculated locally. Supplied balances, totals and paid states are checked for contradictions using integer arithmetic; missing values are never synthesized. Cancellation is labeled not collectible rather than silently changing the server's reported balance.

Unconfirmed projections are isolated in `invoice-api.ts`: invoice-level `balance_minor` (named in the architecture's payment response), `payment_status`, and `billing_account` with optional account identity/billing fields. Coordinate their final DTO names with Adithya. Account names are shown only if supplied; otherwise the real account ID is linked. The list does not issue per-row account or catalog requests.

Lifecycle state remains distinct from settlement presentation. Explicit server `payment_status` may report `UNPAID|PARTIALLY_PAID|PAID|OVERDUE` once this optional projection is agreed. Without it, partial payment is displayed only from supplied `paid_minor` and `total_minor`; PAID is shown only for the canonical PAID lifecycle state. A confirmed invoice whose supplied payment reaches its total remains awaiting settlement until the server updates its state. The frontend never declares overdue from its local clock. Contradictory supplied financial states are reported as an integration error.

Loading, empty response, filtered empty response, 403 permission denial, 404 unavailable service/record, transport/5xx and malformed response states remain distinct. The API client retains cookies, cancellation, CSRF rules for any mutations elsewhere, and no automatic mutation retries. This milestone performs GETs only and exposes no Confirm/Cancel/Send/Record Payment controls.

## Invoice detail

`/app/invoices/:id` uses only `GET /api/invoices/{id}`. A mismatched returned invoice ID is rejected. The document shows the original Billora identity, number/dates, invoice-provided billing details, optional source subscription links, itemized snapshot quantities/prices, server subtotal/discount/tax/grand total, recorded payment entries and supplied balances. Drafts are labeled provisional. Customer details are not fetched from a mutable account record and presented as historical bill-to details; the separate current-account link is explicitly labeled.

Uncertain relationship projections stay in `invoice-detail-api.ts`: optional `lines` and `payments` arrays and line-level `variant_id` / `variant_description`. Financial line fields use the architecture's invoice-line names: `description`, `quantity`, `unit_price_minor`, `line_subtotal_minor`, `discount_minor`, `tax_bps`, `tax_minor`, `total_minor`, `source_subscription_id`. Source subscription IDs link to the existing detail route; no single subscription is hardcoded onto a potentially multi-source invoice. Variant description is shown only if included in the invoice; current variant catalog prices are never requested. The frontend displays supplied line totals and taxes without recomputing them from quantity/rates.

Optional payment entries use documented payment fields `id`, `amount_minor`, `method`, `paid_at`, and `note`. An `invoice_id`, when supplied, must match the parent. Timestamps require an offset and are displayed in Asia/Kolkata. No history API is invented and no sum of visible history rows replaces `paid_minor` or `balance_minor`. Missing arrays are unavailable; explicit empty arrays are shown as empty response entries, not a declaration that an account has no payments. Duplicate IDs, invalid/fractional amounts, cross-record references and contradictory provided financial data are rejected. Supplied discount cannot exceed supplied subtotal. Integer consistency validation does not fill or replace missing backend amounts.

All currency amounts use the existing Money component/formatMoney utility, with invoice currency and INR default. Backend values outside JavaScript's safe integer range produce an integration error instead of a rounded financial display. No production fixtures, optimistic completion, fake email delivery, financial buttons, or mutation requests are included. This milestone does not claim a print/download flow or P1 Explain My Bill.

## Backend coordination

Publish invoice list/detail DTOs and the endpoints; agree the optional balance, billing-identity and settlement projections, exact due-date filter behavior, and snapshot/relationship fields before live verification. Preserve customer isolation and server authorization. Backend absence is not replaced with sample records or mock authentication. Tests use test-only fixtures.

Confirm specifically whether billing identity is an immutable invoice snapshot, the shape/completeness of embedded line/payment collections, variant snapshot field names, and whether balances/settlement indicators use the optional names above. Unknown optional fields remain unavailable; unsupported financial contracts are never guessed through aliases or current catalog lookups. The existing authentication layer must supply a verified session; Phase 3A does not alter it or bypass CSRF.

## Validation and file inventory

`npm.cmd run typecheck` passed. `npm.cmd test -- --reporter=dot` passed **154 tests in 12 files**, including **50 Phase 3A tests**, after rebasing onto `origin/main` at `99e3aea` to include teammate authentication and product-management work. `npm.cmd run build` passed. These checks include list/filter/pagination behavior, currency formatting, unavailable/empty/error/permission handling, immutable details, missing optional fields, canonical versus derived payment statuses, stale reads and ADMIN/STAFF/CUSTOMER route isolation. Real backend, browser/device visual checks, and large-dataset performance remain unverified; no invoice routes are implemented in the inspected backend.

| Directory (relative to frontend/src) | Files created or modified |
| --- | --- |
| `app/` | `router.tsx`, `navigation.ts` (route/navigation integration only) |
| `features/billing/` | `InvoiceListPage.tsx`, `InvoiceDetailPage.tsx`, `InvoiceStatus.tsx`, `invoice-api.ts`, `invoice-detail-api.ts`, `billing.css`, `PHASE3A.md` |
| `tests/` | `invoice-fixtures.ts`, `invoices-list.test.tsx`, `invoices-detail.test.tsx`, `invoices-access.test.tsx` |

No backend, shared contracts, prior customer/subscription/auth code, shared components, global styles, package dependencies or lockfiles were changed. The pre-existing untracked root package-lock.json is preserved. Changes are local commits on main; nothing is pushed automatically.

## Remaining Phase 3B / 3C work

First coordinate and integrate the live invoice GET contracts and run a real authorized list/detail check. Phase 3B then adds backend-backed invoice confirmation (including expected draft version/total agreement), eligible cancellation with consequences and confirmation, truthful send/delivery versus preview/failure handling, and print/download using invoice snapshots. All actions must retain server permission checks, CSRF, pending protection, and refresh after confirmed outcomes. Phase 3C adds payment recording, partial/full balance reconciliation, idempotency, and the confirmed payment-history endpoint. None of these actions is presented as functional in Phase 3A.
