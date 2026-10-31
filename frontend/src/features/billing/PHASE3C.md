# Phase 3C — invoice-scoped payments

## Contract inspection

At `5f01df6`, main is synchronized with origin/main. The checked-in backend contains only auth/product routers and schemas. There are no invoice/payment Pydantic/OpenAPI definitions, payment method enumeration, or shared contracts. No backend or teammate files are changed here.

Architecture §7.2 documents `GET /api/invoices/{id}/payments` and `POST /api/payments`. §7.3 illustrates BANK_TRANSFER, integer `amount_minor`, UTC `paid_at`, `invoice_id`, and `note`; it does not establish the full method enumeration or exact payment result ID/invoice linkage. §6.3 requires an actor-scoped Idempotency-Key and 409 when the same key is reused with a different payload.

## History and balances

The ADMIN/STAFF invoice detail screen has an explicit **View payment history** control. It requests the documented history endpoint only when opened. A feature-local adapter uses the standard §7.1 paginated envelope and page/page_size (20/25/50), requires the parent invoice ID on history rows, validates safe positive integer amounts/timestamps/duplicate IDs and rejects page metadata mismatches. `external_ref` and `note` are displayed when supplied. Read-only historical method strings do not establish supported input methods.

Missing endpoint (404), permission denial (403), conflicts (409), malformed contracts and network errors remain distinct from a successful empty response. History requests are abortable and late pages/invoice responses cannot leak into another invoice. Retry is explicit and read-only. **Refresh invoice and history** reloads the invoice first, then reopens history from page one; no sums of displayed pages replace server `paid_minor` or `balance_minor`. The printable embedded snapshot entries are preserved separately.

Payment presentation uses canonical invoice lifecycle plus supplied server facts: unpaid, partial and paid; overdue only when supplied by the server. No local clock declares overdue, and PARTIALLY_PAID/OVERDUE never become persisted invoice states. Missing paid/balance fields remain unavailable. No standalone `/app/payments` route or global GET payment endpoint is invented; the Payments sidebar item stays unavailable. Customer portal boundaries are unchanged.

## Backend coordination

- Publish the history DTO/envelope, pagination ordering and invoice ownership behavior, optional reference fields, and reversal/history completeness semantics.
- Publish supported recording methods, currency precision and any date/reference constraints. BANK_TRANSFER in an example is not a complete backend enum.
- Publish the exact POST request/result DTO: payment ID field and parent linkage, recorded amount, committed invoice status, paid amount and balance, plus replay/conflict behavior.
- Verify actor-scoped idempotency, atomic no-overpay/state/payment checks and CSRF/Origin/session authorization. Define safe reconciliation after uncertain timeouts without creating a replacement intent.
- Implement invoice GET and payment GET/POST endpoints before live recording can be verified.
