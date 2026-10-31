# Phase 3A — read-only invoices

The invoice UI uses `docs/ARCHITECTURE.md` §4.2, §5.2/5.4 and §7.1/7.2. As inspected at `b801f15`, the backend mounts auth and product routers only; there are no invoice endpoints, Pydantic invoice schemas, OpenAPI artifacts or shared TypeScript contracts. Feature-local adapters are integration boundaries, not new agreed backend contracts. No backend, teammate feature, shared contract or completed Phase 1/2 behavior is rewritten.

## Invoice list

`/app/invoices` is under the existing ADMIN/STAFF guard. `GET /api/invoices` uses the standard `{items,total,page,page_size,has_next}` envelope and `page`, `page_size` (20/25/50), `sort=created_at_desc`, optional `search`, and canonical invoice `status`. The date filter is **exact due date**, sent as `due_on`, the invoice filter named in Architecture §10.1. Search/date apply on submission; status applies on selection. Filters and pagination are kept in the URL. Invalid status/date filters never trigger a broader unfiltered API request. Date-range/issued-date query parameter names are not specified and are not invented.

Core validated fields: `id`, `number`, `billing_account_id`, ISO `issued_on`, `due_on`, canonical `DRAFT|CONFIRMED|PAID|CANCELLED`, safe nonnegative integer `total_minor`, currency (INR default). Optional amounts remain unknown when omitted: `paid_minor`, `balance_minor`, `subtotal_minor`, `discount_minor`, `tax_minor`. No balance or missing amount is calculated locally. Supplied balances, totals and paid states are checked for contradictions using integer arithmetic; missing values are never synthesized. Cancellation is labeled not collectible rather than silently changing the server's reported balance.

Unconfirmed projections are isolated in `invoice-api.ts`: invoice-level `balance_minor` (named in the architecture's payment response), `payment_status`, and `billing_account` with optional account identity/billing fields. Coordinate their final DTO names with Adithya. Account names are shown only if supplied; otherwise the real account ID is linked. The list does not issue per-row account or catalog requests.

Lifecycle state remains distinct from settlement presentation. Explicit server `payment_status` may report `UNPAID|PARTIALLY_PAID|PAID|OVERDUE` once this optional projection is agreed. Without it, partial payment is displayed only from supplied `paid_minor` and `total_minor`; PAID is shown only for the canonical PAID lifecycle state. A confirmed invoice whose supplied payment reaches its total remains awaiting settlement until the server updates its state. The frontend never declares overdue from its local clock. Contradictory supplied financial states are reported as an integration error.

Loading, empty response, filtered empty response, 403 permission denial, 404 unavailable service/record, transport/5xx and malformed response states remain distinct. The API client retains cookies, cancellation, CSRF rules for any mutations elsewhere, and no automatic mutation retries. This milestone performs GETs only and exposes no Confirm/Cancel/Send/Record Payment controls.

## Backend coordination

Publish invoice list/detail DTOs and the endpoints; agree the optional balance, billing-identity and settlement projections, exact due-date filter behavior, and snapshot/relationship fields before live verification. Preserve customer isolation and server authorization. Backend absence is not replaced with sample records or mock authentication. Tests use test-only fixtures.
