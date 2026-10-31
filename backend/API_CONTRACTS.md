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

Tax-rule identifiers are rejected because no tax-rule model/configuration is
present; quotation tax is therefore zero only for requests without a tax rule.
Discounts, subscription transitions/renewal scheduling, invoice lifecycle
mutations, billing runs, reports, and the broader recurring-billing engine
remain unimplemented. These limitations are intentional: the API does not
invent tax, discount, renewal, payment, or quotation values.
