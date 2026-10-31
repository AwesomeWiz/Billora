# Phase 2 subscription integration

Architecture §3.1, §4.2, §5.1, §7.1–7.3 is authoritative. No shared subscription DTO or backend endpoint exists in this checkout. Feature-local adapters validate documented snake_case records; malformed states, dates, money, and envelopes are shown as integration errors, never as empty success. No fake production data is included.

List requests: `GET /api/subscriptions?page=1&page_size=20&sort=created_at_desc` with documented `search`, `status`, `customer_id`. Search is submitted explicitly to avoid a request per keypress; filters/page remain in the URL. The account-ID filter links from customer details. No unsupported plan/date filter query names are invented. The backend must agree `customer_id` (HTTP §7.1) versus `account_id` (performance §10.1) before live verification.

The flat core is `id`, `number`, `account_id`, `plan_id`, canonical `status`, dates and `payment_term_days`. Optional `billing_interval`, `currency`, and `recurring_amount_minor` list projections are isolated in `api.ts`; confirm those projection names with Adithya. When absent, the UI shows account/plan IDs, unavailable amounts, and unavailable intervals. It never computes a recurring total from current catalog prices. Currency defaults to INR per architecture.

Missing names or amounts do not imply empty customer accounts or zero revenue. Account and plan names should eventually be supplied as agreed list projections to avoid N+1 requests. P1 audit timelines, P2 plan switching and forecasts are not part of this batch.

Detail: `GET /api/subscriptions/{id}`. Customer identity uses the documented `GET /api/accounts/{account_id}`. Plan name, interval and explicit policy flags use the documented `GET /api/plans/{plan_id}`; this supporting endpoint is also absent from the current backend. Failures of relationship reads leave the agreement readable and show independent unavailable/permission states. Mismatched returned IDs are rejected.

The optional detail projection `lines` must be confirmed with Adithya. If supplied, each entry is validated against documented subscription-line fields: `id`, `product_id`, optional `variant_id`, `description`, positive integer `quantity`, integer `unit_price_minor`, optional boolean `billable`. Missing lines are marked unavailable; an explicit empty array is shown as empty. Variant identifiers are displayed rather than guessing names or adding current variant prices to historical agreed prices. Recurring totals are never calculated client-side. Payment-term display uses the documented `payment_term_days` field; confirm its date basis.

Related invoices and lifecycle history have no subscription-detail relationship DTO. They remain explicitly unavailable rather than inventing `subscription_id` invoice filters, embedded response fields, or synthetic historical events. This does not implement P1 Activity Timeline.

## Lifecycle request gate

All five controls are implemented with canonical state/role/plan-policy checks. Only ADMIN/STAFF see permitted candidates; missing flags never imply permission. DRAFT, QUOTATION, and CLOSED show no lifecycle actions. CONFIRMED may activate only with an explicitly active plan. ACTIVE may pause/renew/close only with the corresponding explicit plan flag. PAUSED may resume only when pause is permitted and the plan is active. The server remains authoritative for dates, eligibility and authorization.

`POST /api/subscriptions/{id}/transition` uses `{action,reason}` through the shared cookie/CSRF client. Only `ACTIVATE` has a concrete confirmed request example in Architecture §7.3, so `transitionDefinitions` enables only that request. Policy-eligible Pause, Resume, Renew and Close controls are disabled and labeled unavailable; their API integration rejects locally before any request. This follows the explicit instruction to keep unsupported actions unavailable until contract confirmation. Do not turn on those gates until Adithya agrees the action tokens, mandatory parameters, policy handling, and response shape. No renewal duration or expiry is invented.

Every enabled action requires a modal confirmation with record number, consequence and reason. Pending requests prevent duplicate submission and modal dismissal. The UI only reports completion after a validated, identity-matching server response with the expected target state. Rejected, malformed or ambiguous outcomes never change displayed status optimistically. A refresh is required before another attempt; mutations are never automatically retried. A successful mutation triggers a fresh detail read.

Questions for Adithya: publish account/subscription/plan DTOs and the optional `lines` and recurring/interval projections; agree `customer_id` query spelling; confirm the plan-policy endpoint and date rules; confirm PAUSE/RESUME/RENEW/CLOSE payloads, renewal term/expiry input, and response semantics; publish related invoice and lifecycle-history shapes if in scope. The existing backend `/auth/me` and missing CSRF issuance also prevent live authenticated verification. Neither backend nor shared contracts were changed.

## Verification and handoff

`npm.cmd run typecheck` passed; `npm.cmd test -- --reporter=dot` passed **76 tests in 7 files** (43 Phase 2 tests); `npm.cmd run build` passed. Tests cover list loading/empty/error/permission states, server search/status/customer filtering and pagination, stale response suppression, detail and agreed-price rendering, role/plan/state action restrictions, CSRF, modal confirmation, pending requests, rejected/malformed transitions and the authoritative post-success detail refetch. No real-browser/device or backend end-to-end verification is claimed; those remain integration checks once the API is available.

Routes: `/app/customers`, `/app/customers/:id`, `/app/subscriptions`, `/app/subscriptions/:id`, under the existing ADMIN/STAFF guard. Customer portal access is not broadened. Existing shared controls, formatting, tokens, fetch client and auth provider are reused.

Files in the Phase 2 batch (all relative to `frontend/src/`):

| Area | Files |
| --- | --- |
| Routing integration | `app/router.tsx`, `app/navigation.ts` |
| Customer views and feature support | `features/customer/CustomersPage.tsx`, `CustomerDetailPage.tsx`, `api.ts`, `records.ts`, `RecordViews.tsx`, `records.css`, `PHASE2.md` |
| Subscription views and adapters | `features/subscriptions/SubscriptionsPage.tsx`, `SubscriptionDetailPage.tsx`, `api.ts`, `detail-api.ts`, `transitions.ts`, `LifecycleActions.tsx`, `PHASE2.md` |
| Tests | `tests/customers.test.tsx`, `subscriptions-list.test.tsx`, `subscriptions-detail.test.tsx`, `subscriptions-lifecycle.test.tsx` |

Next milestone: Adithya publishes compatible auth/CSRF and customer/subscription/plan endpoints plus shared DTOs; coordinate the pending projections and action payloads, enable only the agreed actions, and verify the real customer → subscription → activate/pause/resume/renew/close flow, including rejection and ownership cases. Then implement P0 invoices and payment recording. Do not start P1/P2 during this integration milestone.
