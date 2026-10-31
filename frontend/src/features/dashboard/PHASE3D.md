# Phase 3D — financial overview and reports

## Verified contracts

Inspected main at `1118156` and fetched origin/main (initially `b96c6a4`, an ancestor). All existing plans, product, invoice and payment commits are preserved. Backend routers/schemas still cover auth and products only. There are no checked-in reports DTOs, report routes or shared contracts.

Architecture §7.3 documents the exact summary fields: currency, range.from/to, active_subscriptions, collected_minor, confirmed_invoiced_minor, outstanding_minor, overdue_count and overdue_minor. The local summary adapter requires every field, valid calendar/range values and safe nonnegative integer counts/amounts. Missing financial values never become zero. It does not assume collected + outstanding = invoiced: payments and receivables may span different reporting periods. No aggregate is reconstructed from paginated invoice/subscription/payment records.

## Financial overview

The existing ADMIN/STAFF `/app/overview` uses only `GET /api/reports/summary` and displays six distinct metrics through existing MetricCard/Money/formatMoney components. The server-returned report range/currency is visible. Loading clears prior values, zero results remain real zero, and missing endpoints, permissions, malformed responses and transport errors remain distinct. Refresh performs a safe GET, with cancellation and stale-response protection. Workspace links navigate to existing subscriptions, invoices/payment history and customer screens. No production fixture, trend, forecast, simulated transaction or unsupported action is added.

## Backend dependencies

Publish the implemented summary DTO and define the scope/as-of semantics of active subscriptions, confirmed invoicing, collected payments, outstanding and overdue aggregates. Implement both report endpoints, enforce ADMIN/STAFF and customer isolation, and define currency behavior. Date-range query names/bounds/inclusivity are not specified by the architecture's response range; they must be coordinated before date filtering can send any request parameters.

## Reports and overdue adapters

`/app/reports` sits under the existing ADMIN/STAFF AppShell guard. Reports navigation is enabled on desktop/mobile; Products and Plans remain available, and Payments/Taxes/Discounts/Staff remain disabled. Overview links to Reports and its overdue section. No catalog or backend files are modified.

The page reads `GET /api/reports/summary` without query parameters and independently reads `GET /api/reports/overdue?page=1&page_size=20`. Standard §7.1 page/page_size and collection envelopes are used, with 20/25/50 rows. Matching page metadata, unique invoice IDs, canonical CONFIRMED state and positive explicit balance are required. The uncertain row projection is isolated in overdue-api.ts and uses the existing architecture invoice adapter, not a newly invented camelCase DTO. Core invoice fields are id/number/billing_account_id/issued_on/due_on/status/total_minor; paid_minor and optional billing_account fields reuse Phase 3A contracts, and overdue reporting requires balance_minor. Coordinate these projections with Adithya before live verification.

Rows link invoice/customer references, display per-invoice currency and server total/paid/balance, and retain missing customer names/paid amounts as unknown. Endpoint membership establishes overdue classification; the frontend does not compare device time, change invoice lifecycle to OVERDUE, or compute outstanding. A table's records/count are not substituted for the summary's independent aggregates/range. Each endpoint has its own loading, empty, unavailable, permission and retry state; pagination cancels old reads and cannot replace current data with a late page.

Date controls remain explicitly disabled. Response `range.from/to` is not proof of request names such as from/to, from_date/to_date, date_from/date_to, or inclusive/as-of behavior. Unsupported or duplicate URL filters and invalid pagination stop report reads and show a reset control rather than silently displaying broader unfiltered figures. Only supported pagination changes are transmitted; no local date/customer filtering of an incomplete page is offered.

Backend handoff must confirm overdue invoice projections, standard envelope/order and page limits, billing-identity/balance fields, per-row currency, and aggregate-vs-row date semantics. Charts/trends, report exports, date/customer/status filters and live performance/E2E checks are unavailable until their data/contracts exist. No fake financial chart or sample record is shipped.

## Validation and owned-file inventory

`npm.cmd run typecheck`, `npm.cmd test -- --reporter=dot` and `npm.cmd run build` passed. The full suite has **352 tests in 22 files**, including **63 new Phase 3D tests**. Tests cover distinct collected/invoiced values, integer money/currency formatting, independent server aggregates, zero/missing/invalid data, safe reads/retries, endpoint failures/permissions, unsupported filters, server pagination, stale pages, ADMIN/STAFF access, CUSTOMER isolation, session expiry, and desktop/mobile catalog/report navigation. Existing invoice, payment, subscription and customer tests pass. Browser/device visual checks, live report queries and 5,000-record performance remain unverified; the backend has no reporting implementation to exercise.

Created in dashboard: `FinancialSummary.tsx`, `summary-api.ts`, `ReportsPage.tsx`, `overdue-api.ts`, `dashboard.css`, `PHASE3D.md`. Modified: existing `WorkspaceHome.tsx`. App integration: `router.tsx`, `navigation.ts`. Created tests: `dashboard.test.tsx`, `reports.test.tsx`, `reports-routing.test.tsx`, and test-only `report-fixtures.ts`. Adjusted existing auth/products/plans routing test mocks to supply the documented summary when the overview makes its new GET. No backend, admin feature, billing, shared components/contracts, package dependencies or lockfiles were edited.

The pre-existing Plans integration commit stays intact, as do all payment and invoice history commits. Root package-lock.json is preserved unchanged and untracked. Phase 3D is two local commits, with no automatic push. Next milestone: agree/publish report DTOs and filter semantics, then run real ADMIN/STAFF end-to-end/report reconciliation and performance checks before enabling any date filters or charts.
