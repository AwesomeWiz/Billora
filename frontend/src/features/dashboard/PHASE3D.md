# Phase 3D — financial overview and reports

## Verified contracts

Inspected main at `1118156` and fetched origin/main (initially `b96c6a4`, an ancestor). All existing plans, product, invoice and payment commits are preserved. Backend routers/schemas still cover auth and products only. There are no checked-in reports DTOs, report routes or shared contracts.

Architecture §7.3 documents the exact summary fields: currency, range.from/to, active_subscriptions, collected_minor, confirmed_invoiced_minor, outstanding_minor, overdue_count and overdue_minor. The local summary adapter requires every field, valid calendar/range values and safe nonnegative integer counts/amounts. Missing financial values never become zero. It does not assume collected + outstanding = invoiced: payments and receivables may span different reporting periods. No aggregate is reconstructed from paginated invoice/subscription/payment records.

## Financial overview

The existing ADMIN/STAFF `/app/overview` uses only `GET /api/reports/summary` and displays six distinct metrics through existing MetricCard/Money/formatMoney components. The server-returned report range/currency is visible. Loading clears prior values, zero results remain real zero, and missing endpoints, permissions, malformed responses and transport errors remain distinct. Refresh performs a safe GET, with cancellation and stale-response protection. Workspace links navigate to existing subscriptions, invoices/payment history and customer screens. No production fixture, trend, forecast, simulated transaction or unsupported action is added.

## Backend dependencies

Publish the implemented summary DTO and define the scope/as-of semantics of active subscriptions, confirmed invoicing, collected payments, outstanding and overdue aggregates. Implement both report endpoints, enforce ADMIN/STAFF and customer isolation, and define currency behavior. Date-range query names/bounds/inclusivity are not specified by the architecture's response range; they must be coordinated before date filtering can send any request parameters.
