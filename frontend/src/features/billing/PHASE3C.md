# Phase 3C — invoice-scoped payments

## Contract inspection

Inspected at `5f01df6`, then safely rebased onto `origin/main` at `8f52912` when teammate plans work arrived. The checked-in backend still contains only auth/product routers and schemas. There are no invoice/payment Pydantic/OpenAPI definitions, payment method enumeration, or shared contracts. No backend or teammate files are changed here.

Architecture §7.2 documents `GET /api/invoices/{id}/payments` and `POST /api/payments`. §7.3 illustrates BANK_TRANSFER, integer `amount_minor`, UTC `paid_at`, `invoice_id`, and `note`; it does not establish the full method enumeration or exact payment result ID/invoice linkage. §6.3 requires an actor-scoped Idempotency-Key and 409 when the same key is reused with a different payload.

## History and balances

The ADMIN/STAFF invoice detail screen has an explicit **View payment history** control. It requests the documented history endpoint only when opened. A feature-local adapter uses the standard §7.1 paginated envelope and page/page_size (20/25/50), requires the parent invoice ID on history rows, validates safe positive integer amounts/timestamps/duplicate IDs and rejects page metadata mismatches. `external_ref` and `note` are displayed when supplied. Read-only historical method strings do not establish supported input methods.

Missing endpoint (404), permission denial (403), conflicts (409), malformed contracts and network errors remain distinct from a successful empty response. History requests are abortable and late pages/invoice responses cannot leak into another invoice. Retry is explicit and read-only. **Refresh invoice and history** reloads the invoice first, then reopens history from page one; no sums of displayed pages replace server `paid_minor` or `balance_minor`. The printable embedded snapshot entries are preserved separately.

Payment presentation uses canonical invoice lifecycle plus supplied server facts: unpaid, partial and paid; overdue only when supplied by the server. No local clock declares overdue, and PARTIALLY_PAID/OVERDUE never become persisted invoice states. Missing paid/balance fields remain unavailable. No standalone `/app/payments` route or global GET payment endpoint is invented; the Payments sidebar item stays unavailable. Customer portal boundaries are unchanged.

## Guarded, unsubmitted payment preparation

The invoice detail includes an ADMIN/STAFF manual recording form. Only CONFIRMED invoices with explicit paid amount and positive server-reported balance are eligible. DRAFT/CANCELLED/PAID, settled, incomplete balances and currencies without agreed precision remain ineligible. INR text converts directly to integer paise using BigInt; zero, negative, over-balance, unsafe, exponent, comma and excess-decimal amounts are rejected. The date/time is explicitly IST and is normalized to UTC for review, independently of the browser timezone. Optional notes are supported by the documented example; reference entry remains disabled pending a request DTO.

No payment method is selectable until the backend publishes accepted values. BANK_TRANSFER appears in the architecture example, but the UI does not pretend it has been validated by an implemented backend. Review can prepare amount/date/note while clearly showing method unavailable; it cannot create a complete request body. A modal re-fetches the invoice, shows the actual supplied balance, detects concurrent changes/409, and supports explicit read retry after network failure. No predicted balance or paid status is calculated.

Each unsubmitted preparation has an in-memory UUID intended for Idempotency-Key. Repeated reviews and read retries of unchanged normalized fields reuse it; explicit edits require a fresh review/key. The method is explicitly absent and must join the binding once confirmed. This identifier is not a payment ID, credential, persisted record or proof of submission. No key is displayed as financial success, and no POST transports it while submission is disabled. A discarded/unmounted unsent form may be prepared anew safely because it has never submitted anything.

Final **Record payment** stays disabled independently of CSRF presence and DOM form validity. No POST adapter or guessed success parser exists, no payment/gateway success is fabricated, and no uncertain write is automatically retried or replaced. The shared API client's cookie/CSRF/idempotency behavior remains intact. Actual POST Idempotency-Key transport, ambiguous-payment reconciliation, returned ID/amount/status/balance verification, and automatic post-success invoice/history refresh remain blocked by the missing contract. A conflict refresh performs the known invoice/history GETs only. Explicit combined refresh is already implemented; history rows never authorize payment amounts.

## Backend coordination

- Publish the history DTO/envelope, pagination ordering and invoice ownership behavior, optional reference fields, and reversal/history completeness semantics.
- Publish supported recording methods, currency precision and any date/reference constraints. BANK_TRANSFER in an example is not a complete backend enum.
- Publish the exact POST request/result DTO: payment ID field and parent linkage, recorded amount, committed invoice status, paid amount and balance, plus replay/conflict behavior.
- Verify actor-scoped idempotency, atomic no-overpay/state/payment checks and CSRF/Origin/session authorization. Define safe reconciliation after uncertain timeouts without creating a replacement intent.
- Implement invoice GET and payment GET/POST endpoints before live recording can be verified.

## Validation and file inventory

After integrating teammate Plans commits through `8f52912`, `npm.cmd run typecheck` passed; `npm.cmd test -- --reporter=dot` passed **279 tests in 18 files**, including **66 new Phase 3C tests**; `npm.cmd run build` passed. Regression checks cover history states/pagination/parent validation, supplied partial/full/overdue statuses, exact amount/date parsing, overpayment guards, roles, unavailable contracts, duplicate review checks, stable preparation keys, explicit read retries, 403/409/network failures, stale responses and invoice/history refresh. Existing transport tests continue to verify cookie/CSRF and Idempotency-Key behavior. No mocked POST success or invented payment response DTO is tested as a real integration.

Created under billing: `InvoicePaymentHistory.tsx`, `payments-api.ts`, `PaymentRecording.tsx`, `payment-intent.ts`, `PHASE3C.md`. Modified under billing: `InvoiceDetailPage.tsx`, `InvoiceStatus.tsx`, `invoice-detail-api.ts`, `billing.css`. Created tests: `payments-history.test.tsx`, `payments-recording.test.tsx`; adjusted `invoices-list.test.tsx` for the explicit Unpaid label. All changes stay within owned billing/tests directories; routes, navigation, backend, admin modules, shared contracts, packages and lockfiles are unchanged.

Live backend recording/history, ambiguous write reconciliation and browser/device visual checks remain unverified. The recording submission is genuinely disabled. The next milestone is Adithya's payment/invoice DTO and method publication, then verified idempotent POST integration, strict returned payment ID/amount/invoice status/balance checks and post-success GET refresh. The unrelated root package-lock.json remains unchanged, untracked and uncommitted. Local commits only; no push.
