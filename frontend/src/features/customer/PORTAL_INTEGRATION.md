# Customer self-service portal integration

## Verified scope

Inspected main through `6d8f9ff` and the existing P0 audit. The backend mounts auth/products only. `/auth/me` still omits the real User.id. Its newer Origin/product fixes do not supply customer billing reads. No auth acceptance rules were relaxed. Complete sessions in portal tests are test fixtures, not evidence that real login now works.

The CUSTOMER AppShell mounts `/portal/home`, `/portal/subscriptions` and `/portal/subscriptions/:id`. Home metrics remain unavailable, not zero; no business-wide report or paginated-list aggregation is used. Subscription views deliberately do not fetch internal records or accept an account_id query as proof of ownership. Pause/close/renew stay disabled. No customer record is invented.

## Required backend ownership contracts

Use the existing architecture paths, not new speculative `/portal` or `/me/subscriptions` API routes:

- `GET /api/subscriptions` and `GET /api/subscriptions/{id}` must authenticate the principal and constrain repository reads by the CUSTOMER session's billing account. Ignore/reject attempted cross-account filters. Return only customer-safe plan/status/date/amount fields, integer minor units/currency and the agreed paginated envelope.
- For list and detail, test two real accounts: A cannot read B's records by changing IDs, filters or pagination. Return 404 (or agreed 403) without disclosing record existence. Validate ownership before serializing relations; do not expose internal activity or other customers through nested links.
- Subscription reads are own-account read-only by default. No customer lifecycle action is enabled until an explicit customer policy/capability and mutation DTO, CSRF/Origin and server eligibility enforcement are confirmed. The internal transition example is not customer authorization.
- Home needs an explicitly authorized customer summary projection for active count, next renewal and outstanding balance. Its path/DTO is not documented, so no request is guessed. Recent invoices need a supported scoped sort/limit contract. Never substitute business-wide `/api/reports/summary` or totals calculated from one page.
- `/api/auth/me` must return the actual User.id alongside role/account_id/email and server-issued CSRF. No cached registration ID or account_id substitution.

Backend ownership enforcement and successful owned/cross-account reads are **unverified**, not implemented by a client-side filter. Current tests prove the frontend makes no unverified data requests; they do not prove backend isolation. Loading/error/permission handling remains at the existing protected-session boundary until a safe billing request can be enabled. A missing contract is presented as unavailable rather than a fake empty response.
