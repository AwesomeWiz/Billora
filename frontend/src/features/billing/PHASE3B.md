# Phase 3B — invoice safeguards and browser printing

## Verified contract boundary

Inspected `origin/main` at `ccdaf38`. `backend/app/main.py` mounts auth and products only; no invoice router, invoice Pydantic DTOs, shared contracts, or saved invoice OpenAPI schemas exist. Architecture §7.2 names `POST /api/invoices/{id}/confirm`, `/cancel`, `/send` and `GET /api/invoices/{id}/print`. An endpoint name does not establish its payload, response or guarantees.

Architecture §5.2 permits DRAFT → CONFIRMED → PAID and cancellation only of unpaid DRAFT/CONFIRMED invoices. §5.3 requires transactional discount finalization, expected draft revision/total and 409 on changed amounts. The names/types of those request fields and the revision in invoice reads remain unspecified. No guessed mutation bodies, empty-body POSTs, financial status changes, token workarounds, or placeholder successes are implemented.

## Confirmation and cancellation review

ADMIN/STAFF can review eligible loaded invoices in an explicit modal. The review re-fetches the existing GET detail endpoint and validates its response through the Phase 3A adapter. It displays supplied server totals/paid amounts, explains consequences, and keeps final confirmation/cancellation disabled with a visible contract blocker. Checking the GET record is not server finalization or authorization to mutate.

Local prerequisites reject paid/cancelled invoices, any known payment, missing paid amount, non-draft confirmation and incomplete draft totals/itemized snapshots. They are conservative UI checks; the server must repeat authorization, payment and state checks transactionally. A changed snapshot or 409 requires refresh/review. A 403 shows permission failure without automatic retry. Safe read retries are explicit; rapid repeated review clicks are guarded, closing/unmounting aborts reads, and late responses cannot revive closed reviews. No mutation completion or refreshed financial state is assumed.

## Backend handoff required before enabling mutations

- Confirm: publish input DTO field names for expected draft revision/total and currency binding; expose its revision on GET; specify final invoice result and 409 changed-total summary. Guarantee atomic, once-only discount redemption/finalization.
- Cancel: publish required reason/expected state or revision fields (if any), output DTO and cancellation eligibility. Reject full/partial recorded payments and concurrent payment races. Preserve processed billing cycles; do not silently reissue.
- Send: publish input DTO, eligible states, recipient rules, duplicate-send/idempotency policy, result and read/status linkage. Separate queue acceptance, provider send, actual delivery, failure and PREVIEW_ONLY; provide evidence before a delivered claim.
- All writes: enforce ADMIN/STAFF authorization, session cookies, CSRF/Origin validation and meaningful 401/403/409/422 responses. Specify reconciliation after ambiguous network failure; never auto-retry financial writes.
- GET invoice endpoints and immutable bill-to/line/payment projections remain required from Phase 3A before live integration can be verified.
