# Phase 2 customer API handoff

Feature-local adapters follow `docs/ARCHITECTURE.md` §4.2/§7.1. They are not shared contracts and must be replaced with coordinated imports when Adithya publishes `contracts/`. The current backend has auth code only. Its Account ORM uses `email` and lacks the documented billing identity; it is not silently treated as a customer DTO. No backend, shared contract, global style, or Phase 1 auth changes are made here.

Customers: `GET /api/accounts?page=1&page_size=20&sort=created_at_desc&search=...`, `GET /api/accounts/{id}`. Lists require `{items,total,page,page_size,has_next}`. Accounts require `id`, `display_name`, `billing_email`; `billing_address` is an optional string and `currency` defaults to INR when omitted. Unexpected response shapes produce a visible integration error. No fake rows are substituted.

Search and pagination run on the server; currency filtering is explicitly limited to the current page because the HTTP specification does not define a currency filter. Filters and pagination persist in the URL. Customer subscriptions link to `/app/subscriptions?customer_id=...`, using the documented HTTP customer filter. Invoice links await billing route and relationship integration; no unsupported query or dead invoice link is fabricated.

Backend blockers: publish customer DTOs and endpoints, agree Account ORM versus billing-account shape, and resolve the Phase 1 `/auth/me`/CSRF mismatch before live end-to-end verification. The frontend does not bypass these dependencies.
