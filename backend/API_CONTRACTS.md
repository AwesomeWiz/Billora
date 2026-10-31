# Backend billing read APIs

These endpoints read existing persisted rows. They do not create or estimate
billing records.

## Customer accounts

- `GET /api/accounts?page=1&page_size=20&search=...` — ADMIN/STAFF only.
- `GET /api/accounts/{account_id}` — authenticated; CUSTOMER may read only their
  own account, ADMIN/STAFF may read customer accounts.

The page uses `{items,total,page,page_size,has_next}`. Account data currently
comes from `accounts` and optional `customers` rows. The legacy schema has no
billing address or account currency, so those remain null/default INR; missing
customer names fall back to the actual billing email.

## Subscriptions

- `GET /api/subscriptions` — authenticated; CUSTOMER rows are constrained to
  their own account. ADMIN/STAFF may query all accounts. Supports `page`,
  `page_size`, `search`, `status`, and internal `customer_id`.
- `GET /api/subscriptions/{id}` — same authorization and ownership rules.

The legacy table has no human-readable subscription number or next renewal
date. `number` is the persisted UUID identifier and `next_billing_date` is null,
not inferred. Legacy `CANCELED`/`EXPIRED` records are represented as terminal
`CLOSED` in the frontend's canonical status vocabulary.

## Invoices

- `GET /api/invoices` — authenticated, paginated, with optional `search`,
  canonical `status`, and internal `account_id`; CUSTOMER queries are always
  scoped to their session account.
- `GET /api/invoices/{id}` — same authorization and ownership rules.

`total_minor` comes from persisted `amount_paise`; `paid_minor` and
`balance_minor` reflect the legacy paid boolean (full or unpaid only).
`currency` is INR because the stored amount is explicitly in paise. The legacy
invoice table has no human-readable invoice number, payment ledger, partial
payment fields, cancellation state, or immutable line snapshots. Consequently,
these read endpoints do not expose fabricated line items or partial payments.

## Customer dashboard

- `GET /api/customers/me/dashboard` — CUSTOMER only.

Returns an active-subscription count, a server-aggregated outstanding balance
in paise from all unpaid invoices, and up to five recent persisted invoices.
The legacy schema does not record a renewal schedule, so `next_renewal_date` is
null.

## Payments

- `POST /api/payments` — ADMIN/STAFF only; requires session, CSRF, trusted
  Origin, and an `Idempotency-Key` header. Accepts `invoice_id`, positive
  `amount_minor`, `method`, and optional `note`. Uses integer paise, records the
  acting user, allows partial payments, rejects overpayment, and returns the
  original record for an identical idempotent retry.
- `GET /api/invoices/{id}/payments` — authenticated; customers can see only
  payments for their own invoices.

Invoice read models now reconcile `paid_minor` and `balance_minor` against
payment records. Legacy invoices marked paid before payment tracking remain
reported as fully paid, but do not gain fabricated payment-history rows.

## Quotations and templates

- `GET,POST /api/quotation-templates` and `GET /api/quotation-templates/{id}`
  — ADMIN/STAFF only. Template lines are checked against active product and
  variant catalog prices.
- `GET,POST /api/quotations`, `GET /api/quotations/{id}`, and
  `POST /api/quotations/{id}/confirm` — ADMIN/STAFF only. Creation validates
  catalog prices, snapshots product/variant names and integer-paise line totals,
  creates a linked `QUOTATION` subscription, and sets a validity date.
  Confirmation atomically moves the quotation to `ACCEPTED` and its linked
  subscription to `CONFIRMED`; expired confirmations are rejected.

Quotation lines can reference active effective tax rules. Tax is calculated in
integer paise using basis points and half-up rounding; product-scoped rules are
checked against the line's product. Taxable quote totals are snapshotted. Tax
rules are managed through `GET,POST /api/taxes`, `GET /api/taxes/{id}`, and
`PATCH /api/taxes/{id}`; reads allow ADMIN/STAFF and mutations require ADMIN,
CSRF, and trusted Origin.

## Revenue Radar, activity, and notifications

- `GET /api/alerts/revenue-leaks` — ADMIN/STAFF. Detects persisted overdue
  invoice balances, including partial payments. Summary amounts use paise.
- `GET /api/events` — authenticated and paginated; customer accounts see only
  events associated with their account. Payment and quotation create/accept
  actions are recorded transactionally.
- `GET /api/notifications` and read/read-all routes — authenticated and scoped
  to the current user.
- `POST /api/notifications/renewals/run` — ADMIN/STAFF; creates deduplicated
  `PREVIEW_ONLY` notices for subscriptions with a persisted end date exactly
  7, 3, or 1 days away. No email is sent.

There is no persisted next-billing date or billing-cycle table, so missed-cycle
and blocked-billing findings are not emitted. Notifications reflect recorded
subscription end dates only; they are not a substitute for recurring billing.

## Subscription lifecycle, invoice lifecycle, and reports

- `POST /api/subscriptions/{id}/transition` — ADMIN/STAFF, session + CSRF +
  trusted Origin. Validates state transitions and plan pause/close policy;
  activation records a first due date from the plan interval, and pausing
  retains that anchor.
- Invoice actions: `POST /api/invoices/{id}/confirm`, `/cancel`, and `/send`,
  plus `GET /api/invoices/{id}/print`. Confirm/cancel require ADMIN/STAFF and
  CSRF/Origin. Cancellation is limited to confirmed unpaid invoices. Send
  explicitly returns `PREVIEW_ONLY`; the backend has no configured delivery
  adapter. Print returns printable HTML and respects customer ownership.
- `GET /api/reports/summary` and `/api/reports/overdue` — ADMIN/STAFF.
  Calculations use persisted invoice and payment rows and integer paise.

These endpoints do not create invoice lines or billing cycles. Activating a
subscription does not by itself run billing. Month-end recurrence anchoring,
missed-cycle backfill, and preview/run billing endpoints remain unavailable
until the subscription line/pricing and billing-cycle schema is implemented.

## CSV product import

- `POST /api/imports/preview` accepts multipart CSV, creates a per-user staged
  import, and returns headers/sample rows. Uploads are limited to 2 MB and
  5,000 data rows.
- `POST /api/imports/validate` validates product mappings and integer paise.
- `POST /api/imports` creates valid product rows once; retries of an executed
  batch conflict. ADMIN only; batch reads/writes are bound to the creating user.

Customer and subscription imports are deliberately rejected until their
required identity and lifecycle validation workflows exist.

## GST settings and limitations

- `GET,PATCH /api/gst/settings` — ADMIN/STAFF reads; ADMIN-only writes.
- `GET /api/gst/intelligence` and `GET /api/gst/errors` return recorded-state
  summaries. Current invoices do not store tax snapshots, so intelligence
  returns zero recorded tax and `tax_snapshot_data_available: false`; no GST
  errors are generated or simulated. Approving an unknown error returns 404.

Discount application, subscription transitions/renewal scheduling, invoice
lifecycle mutations, recurring billing, financial reports, password reset,
staff administration, demo seeding, and performance benchmarks remain
unimplemented. These limitations are intentional: endpoints do not invent
tax, discount, renewal, or compliance records.
