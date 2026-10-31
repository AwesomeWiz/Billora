# Phase 3B — invoice safeguards and browser printing

## Verified contract boundary

Inspected `origin/main` initially at `ccdaf38` and again at `47499c9` (backend authentication/database fixes), safely rebasing the local invoice work without conflicts. `backend/app/main.py` mounts auth and products only; no invoice router, invoice Pydantic DTOs, shared contracts, or saved invoice OpenAPI schemas exist. Architecture §7.2 names `POST /api/invoices/{id}/confirm`, `/cancel`, `/send` and `GET /api/invoices/{id}/print`. An endpoint name does not establish its payload, response or guarantees.

Architecture §5.2 permits DRAFT → CONFIRMED → PAID and cancellation only of unpaid DRAFT/CONFIRMED invoices. §5.3 requires transactional discount finalization, expected draft revision/total and 409 on changed amounts. The names/types of those request fields and the revision in invoice reads remain unspecified. No guessed mutation bodies, empty-body POSTs, financial status changes, token workarounds, or placeholder successes are implemented.

## Confirmation and cancellation review

ADMIN/STAFF can review eligible loaded invoices in an explicit modal. The review re-fetches the existing GET detail endpoint and validates its response through the Phase 3A adapter. It displays supplied server totals/paid amounts, explains consequences, and keeps final confirmation/cancellation disabled with a visible contract blocker. Checking the GET record is not server finalization or authorization to mutate.

Local prerequisites reject paid/cancelled invoices, any known payment, missing paid amount, non-draft confirmation and incomplete draft totals/itemized snapshots. They are conservative UI checks; the server must repeat authorization, payment and state checks transactionally. A changed snapshot or 409 requires refresh/review. A 403 shows permission failure without automatic retry. Safe read retries are explicit; rapid repeated review clicks are guarded, closing/unmounting aborts reads, and late responses cannot revive closed reviews. No mutation completion or refreshed financial state is assumed.

## Sending and delivery information

Sending stays disabled with an explanation. The documented optional invoice `sent_at` is validated as a timestamp and displayed only as a service-reported send record, never delivery proof. Missing status is **Delivery not verified**, not “not sent”, “sent” or “delivered”. The app does not infer email outcomes from invoice lifecycle, an HTTP success code, a recipient address, printing, or unknown response fields.

Architecture §9.2 defines notification QUEUED/SENT/FAILED/RETRY_QUEUED/PREVIEW_ONLY, but no invoice delivery result projection or linked status endpoint is agreed. Those states are not invented on invoices or populated from test fixtures in production. PREVIEW_ONLY must stay distinct from a send; actual delivery needs explicit backend evidence. The UI does not request email or modify notification modules.

## Browser printing

ADMIN/STAFF can open the browser print dialog for a successfully loaded invoice using the same immutable snapshot document and shared monetary formatting. The named A4 print page removes shell/chrome/actions, retains invoice state (including draft/cancelled), wraps long identifiers and line descriptions, removes horizontal table minimum widths/overflow, repeats table headers and permits multi-page documents. Missing fields remain visibly unavailable; current catalog/account values are not substituted. Print-dialog errors are visible; afterprint only releases the print control and never claims printing, download, delivery, payment or confirmation succeeded.

No `/print` response format or PDF endpoint is assumed. Browser Print / Save as PDF is a local output flow, not a verified backend-generated PDF. CSS applies to the browser menu Print command too. Live invoice API checks and browser/device/PDF visual pagination still require verification; automated tests do not prove physical printer output.

## Backend handoff required before enabling mutations

- Confirm: publish input DTO field names for expected draft revision/total and currency binding; expose its revision on GET; specify final invoice result and 409 changed-total summary. Guarantee atomic, once-only discount redemption/finalization.
- Cancel: publish required reason/expected state or revision fields (if any), output DTO and cancellation eligibility. Reject full/partial recorded payments and concurrent payment races. Preserve processed billing cycles; do not silently reissue.
- Send: publish input DTO, eligible states, recipient rules, duplicate-send/idempotency policy, result and read/status linkage. Separate queue acceptance, provider send, actual delivery, failure and PREVIEW_ONLY; provide evidence before a delivered claim.
- All writes: enforce ADMIN/STAFF authorization, session cookies, CSRF/Origin validation and meaningful 401/403/409/422 responses. Specify reconciliation after ambiguous network failure; never auto-retry financial writes.
- GET invoice endpoints and immutable bill-to/line/payment projections remain required from Phase 3A before live integration can be verified.

## Validation and owned files

`npm.cmd run typecheck`, `npm.cmd test -- --reporter=dot`, and `npm.cmd run build` passed after integration with `47499c9`. The full suite contains **204 tests in 15 files**, including **42 new Phase 3B tests**. Coverage includes review eligibility, fresh amounts, concurrent payment changes, 403/409/503, duplicate checks, abort/late responses, internal roles, blocked sending, unagreed delivery fields, send timestamps, print lifecycle/errors and unchanged financial state. Production build output remains ignored.

Files created: `InvoiceActions.tsx`, `invoice-actions.ts`, `InvoiceOutput.tsx`, `PHASE3B.md` in billing; `invoices-actions.test.tsx`, `invoices-output.test.tsx` in tests. Files modified: billing `InvoiceDetailPage.tsx`, `invoice-detail-api.ts`, `billing.css`; test-only `invoice-fixtures.ts`, `invoices-detail.test.tsx`. No backend, shared contracts, authentication, catalog module, routing, dependencies or shared components were edited. Existing invoice and products integration commits are preserved. Root `package-lock.json` remains unchanged, untracked and uncommitted. Nothing is pushed.

This is the available frontend portion of Phase 3B, not completed end-to-end financial actions. The next milestone is coordinated live invoice GET/action DTO integration, followed by actual confirm/cancel/send outcomes, concurrency and delivery-provider verification. Phase 3C payment recording remains separate.
