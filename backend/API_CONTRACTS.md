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

## Not implemented yet

Payment history/recording and quotation/template endpoints are not available.
The current database has no payment, idempotency, quotation, tax-rule, or
discount-rule tables. No payment or quotation success response is fabricated.
