# Phase 2 subscription integration

Architecture §3.1, §4.2, §5.1, §7.1–7.3 is authoritative. No shared subscription DTO or backend endpoint exists in this checkout. Feature-local adapters validate documented snake_case records; malformed states, dates, money, and envelopes are shown as integration errors, never as empty success. No fake production data is included.

List requests: `GET /api/subscriptions?page=1&page_size=20&sort=created_at_desc` with documented `search`, `status`, `customer_id`. Search is submitted explicitly to avoid a request per keypress; filters/page remain in the URL. The account-ID filter links from customer details. No unsupported plan/date filter query names are invented. The backend must agree `customer_id` (HTTP §7.1) versus `account_id` (performance §10.1) before live verification.

The flat core is `id`, `number`, `account_id`, `plan_id`, canonical `status`, dates and `payment_term_days`. Optional `billing_interval`, `currency`, and `recurring_amount_minor` list projections are isolated in `api.ts`; confirm those projection names with Adithya. When absent, the UI shows account/plan IDs, unavailable amounts, and unavailable intervals. It never computes a recurring total from current catalog prices. Currency defaults to INR per architecture.

Missing names or amounts do not imply empty customer accounts or zero revenue. Account and plan names should eventually be supplied as agreed list projections to avoid N+1 requests. P1 audit timelines, P2 plan switching and forecasts are not part of this batch.
