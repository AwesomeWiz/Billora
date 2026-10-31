# Billora — Product Requirements Document (PRD)

> **Product:** Billora — Intelligent Subscription, Billing & Revenue Automation Platform  
> **Challenge:** Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026 — Virtual Round  
> **Source problem:** *Subscription Management System* (Brightloop Software scenario; supplied four-page PDF)  
> **Version:** 1.0 — Hackathon implementation baseline  
> **Team:** Abhishikth, Abiya, Adithya  
> **Build window:** 9:00 AM–5:00 PM IST (8 hours)  
> **Document status:** Implementation-ready proposal; business-rule assumptions are identified below  
> **Primary purpose:** Authoritative product scope and acceptance criteria for the repository and AI coding assistants

---

## 0. How to read this document

This PRD intentionally separates **what the challenge requires** from **what the team proposes to build beyond it**.

| Label | Meaning | Delivery rule |
|---|---|---|
| **P0 / Official** | Requirement explicitly stated or clearly implied by the supplied problem statement | Mandatory target; do not trade away for extra features |
| **P1 / Differentiator** | Team-selected enhancement with strong demo/business value | Implement after the corresponding P0 workflow works end-to-end |
| **P2 / Advanced** | Valuable enhancement with more integration or domain complexity | Attempt only after P0 and key P1 features are stable |
| **P3 / Stretch** | Optional extension with significant risk or external dependency | Document/design first; implement only if time remains |
| **Assumption** | A team interpretation of something the PDF does not specify | Keep explicit; change if evaluator clarification contradicts it |

**Source of truth:** The four-page *Subscription Management System.pdf* describes Brightloop Software and its ordinary billing month. This PRD uses “Brightloop” as the **fictional customer/business** in seed and demo data, while **Billora** is the product being built. Do not accidentally rename the scenario company to Billora.

**Scope safeguard:** Inclusion in this full product PRD does **not** mean every P1–P3 feature must ship during eight hours. The app must not display fake functioning buttons or claim integrations work when they are mocked.

---

## 1. Product overview

### 1.1 Problem

Recurring subscription businesses often manage customer accounts, renewals, quotations, invoices, payments, discount rules, and revenue reports in disconnected spreadsheets and manual processes. This creates missed renewals, inconsistent invoices, duplicate or skipped charges, difficult payment reconciliation, and poor visibility into recurring revenue.

### 1.2 Vision

**Billora is a unified subscription operations platform that turns a configured plan into a traceable recurring billing workflow, with customer self-service and actionable revenue intelligence.**

### 1.3 Product promise

1. **Configure once:** Admins define products, variants, plans, taxes, discount rules, and quotation templates.
2. **Operate reliably:** Staff manage quotations, subscriptions, invoices, and payments through controlled states.
3. **Automate repeat work:** Due invoices and applicable discounts/taxes are computed consistently; the billing engine is safe to retry.
4. **Give customers clarity:** Customers can view and manage permitted subscriptions, invoices, balances, and upcoming renewals.
5. **Surface business health:** Finance users can monitor active subscriptions, collected revenue, outstanding invoices, and risks.

### 1.4 Target users and jobs-to-be-done

| Persona | Job-to-be-done | Primary screens |
|---|---|---|
| **Admin** | Configure the catalog, policies, financial rules, staff access, and automation | Overview; Products; Plans; Taxes; Discounts; Staff; Automation |
| **Internal staff / sales / finance** | Prepare quotations, activate or manage subscriptions, confirm/send invoices, record payments, follow overdue accounts | Customers; Quotations; Subscriptions; Invoices; Payments; Reports |
| **Customer** | Sign up, inspect offerings and own subscriptions, see invoices, understand and manage renewal choices allowed by plans | Customer Portal; My Subscriptions; My Invoices; Account |
| **Enterprise billing parent** (P3) | See authorized child accounts, usage, and consolidated bills | Organization; Child Accounts; Consolidated Invoices |

### 1.5 Explicit non-goals for hackathon baseline

- Real card processing or PCI-sensitive payment storage; **payment recording** is in scope, payment **processing** is not mandated.
- A complete accounting ledger, bank reconciliation, tax compliance engine, or Odoo ERP plugin.
- Predictive machine learning, external AI API dependency, production-scale observability, or microservices.
- Full WhatsApp message delivery unless official credentials, template approval, and consent are already available.
- Multi-currency, complex proration, metered API billing, multiple tax jurisdictions, and unrestricted nested organizations unless separately approved.

---

## 2. Goals and success criteria

### 2.1 Required business outcomes

| ID | Outcome | Acceptance evidence |
|---|---|---|
| G-01 | One connected workflow from catalog to subscription to invoice to payment | A real seeded/customer-created record remains linked across screens |
| G-02 | Reliable recurring billing | A due invoice is produced; rerunning does not duplicate it; missed cycles are not silently lost |
| G-03 | Correct pricing | Variant adjustment, quantity, discount, tax, and totals are visibly traceable |
| G-04 | Secure customer isolation | Customer A cannot read or mutate Customer B's data by guessing an ID |
| G-05 | Admin-versus-staff role enforcement | A staff member cannot create staff accounts or change admin-only discount rules |
| G-06 | Useful operational visibility | Active subscriptions, revenue received, outstanding and overdue invoices are derivable from real records |
| G-07 | Large-list usability | Relevant pages respond within two seconds with thousands of seeded subscriptions, under an explicitly documented local test environment |
| G-08 | Hackathon accountability | All three teammates author and push meaningful code commits to `main` at least hourly |

### 2.2 Quality targets

- API operations return structured success/error responses; loading, empty, error, and success states are visible in UI.
- Financial calculations are deterministic and use **decimal/integer minor-unit arithmetic**, never binary floats.
- Validation runs **on both client and server**; server validation is authoritative.
- Critical workflows have automated tests and one working end-to-end demo path.
- The app can start from documented instructions and create/seed its local database.
- No live database containing personal information, tokens, or passwords is committed to Git.

---

## 3. Roles and permissions

### 3.1 Baseline roles

- `ADMIN`: full system configuration and user/staff management; may act on operational records.
- `STAFF`: approved operational actions for customer service, quotations, subscriptions, invoices, payments, and dashboard; **cannot** manage staff users or admin-only catalog/discount/tax policy configuration.
- `CUSTOMER`: can view and perform explicitly allowed operations **only on own account data**.

The PDF names admin, limited internal staff, and customer portal. The exact staff permission matrix below is a **proposed least-privilege interpretation**.

| Capability | Admin | Staff | Customer |
|---|:---:|:---:|:---:|
| Sign in / change own password | Yes | Yes | Yes |
| Create staff account | Yes | No | No |
| Create/edit products, variants, plans, taxes, discount rules | Yes | No | No |
| View catalog and active offers | Yes | Yes | Yes, published offers |
| Create and manage quotation templates | Yes | Yes | No |
| Create/advance quotations and subscriptions | Yes | Yes | Own requests only, if enabled |
| Confirm/cancel/send/print invoices | Yes | Yes | No |
| Record payments | Yes | Yes | No |
| View all customers/subscriptions/invoices | Yes | Yes | No |
| View own subscriptions/invoices | Yes | N/A | Yes |
| View aggregate operational reporting | Yes | Yes | No |
| Run actual due-billing job | Yes | Authorized operations only | No |
| Preview Time Machine | Yes | Yes | Own renewal preview only (optional) |

**Authorization rule:** Hiding UI controls is insufficient. Verify permission and ownership on every relevant API call and database query.

---

## 4. Official functional requirements (P0)

Each requirement below comes from the official Brightloop scenario. `FR-*` identifiers should appear in tests, issue names, and the requirements coverage checklist.

### 4.1 Accounts, authentication, and access — PDF p.2

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-AUTH-01 | Customer self-registration with email and password | User can register, log in, log out, and see their customer portal |
| FR-AUTH-02 | Unique email per account | Email uniqueness enforced at DB level, normalized for comparison; duplicate returns clear validation error |
| FR-AUTH-03 | Password strength | Password length **strictly greater than 8**; at least one uppercase, one lowercase, and one special character; no unsupported digit requirement imposed |
| FR-AUTH-04 | Forgot password / reset link | Request generates expiring one-time token; link is sent to the registered email through configured email provider; reset updates stored hash and invalidates token |
| FR-AUTH-05 | Role-based access | Admin, staff, and customer receive different authorized capabilities; backend enforces access |
| FR-AUTH-06 | Staff provisioning | Only admin can create staff account; attempts by staff/customer are rejected |
| FR-AUTH-07 | Customer record isolation | Customers cannot access another customer's subscription or invoice through direct API requests |

**Security/UX:** Secure password hashing; no plaintext passwords/tokens in logs; neutral response for unregistered password-reset emails to reduce account enumeration. Email preview mode is allowed for local demonstration but must be **visibly labeled** and does not count as actual delivery.

### 4.2 Products and variants — PDF p.3

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-CAT-01 | Create products | Admin records product name, type, sales price, cost price, notes |
| FR-CAT-02 | Configure variants | Product can have one or more selectable variants with price adjustments |
| FR-CAT-03 | Variant price computation | Example “Odoo” brand variant adds **560** to the base unit price; value reflected in quote/subscription/invoice lines |
| FR-CAT-04 | Catalog browsing | Admin/staff can search/view products and variants; customers see only active/published sellable products (team policy) |

### 4.3 Plans and lifecycle policies — PDF p.3

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-PLAN-01 | Plan creation | Admin sets price, billing interval (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), minimum quantity, availability start/end |
| FR-PLAN-02 | Plan-specific closure policies | Admin chooses whether plan subscriptions auto-close at expiry and whether early-close, pause, and renewal are permitted |
| FR-PLAN-03 | Policy enforcement | Disallowed pause/close/renew rejected by API; expiry behavior follows configured plan policy |
| FR-PLAN-04 | Plan eligibility | Unavailable plans cannot be selected for a new subscription; quantity cannot violate plan minimum |

**Assumption:** Plan price is the pricing basis for subscription billing, while product/variant lines provide itemized charges. Exact combination of plan base fee and product prices is not prescribed; see §11 for proposed default.

### 4.4 Quotation templates and subscription state machine — PDF p.3

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-QUOTE-01 | Quotation templates | Staff/admin can create reusable template containing plan, product lines, quantities, and validity duration in days |
| FR-QUOTE-02 | Create quotation from template | New quotation is prefilled with selected customer's details and template lines, then editable before confirmation |
| FR-QUOTE-03 | Quote validity | Template-derived quote computes `valid_until`; expired quotation cannot be confirmed without regeneration/extension |
| FR-SUB-01 | Unique subscription reference | Each subscription has unique human-readable number/reference |
| FR-SUB-02 | Subscription data | Store customer, plan, start/expiry dates, payment terms, product lines, quantity, unit price, taxes, and amount |
| FR-SUB-03 | Lifecycle states | Support `DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED` and display current status for internal team |
| FR-SUB-04 | Controlled transitions | Invalid transitions rejected; reason/time/actor recorded where feasible |
| FR-SUB-05 | Pause/renew/early-close actions | Supported according to associated plan's policy and reflected in billing eligibility |

**Status interpretation:** The five states above are from the PDF. `PAUSED` may be implemented as a distinct operational status or as `is_paused` plus audit events. Whichever model is chosen must not silently change the official progression; define transitions once and use them consistently.

### 4.5 Automated invoices and tax — PDF p.3

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-BILL-01 | Automatic due-invoice generation | Billing job identifies all eligible due subscriptions and produces invoices using customer, product lines, tax, and totals |
| FR-BILL-02 | Bulk handling | Job processes multiple due subscriptions without manual entry; records successes/failures |
| FR-BILL-03 | Tax rules | Admin defines tax rules; eligible rules calculate automatically for each relevant line |
| FR-BILL-04 | Invoice lifecycle | `DRAFT → CONFIRMED → PAID`; cancellation supported as explicit side transition (`CANCELLED`) |
| FR-BILL-05 | Invoice actions | Authorized staff/admin can confirm, cancel, send, and print/download invoices |
| FR-BILL-06 | No duplicate billing | Same subscription and billing cycle cannot be invoiced twice, even if job is rerun |
| FR-BILL-07 | No skipped due cycles | Missed cycles remain eligible to process after app downtime, subject to closure/expiry policies |
| FR-BILL-08 | Billing snapshots | Invoices preserve line prices, discounts, tax rates, and totals at generation; later changes do not alter historical invoices |

**Critical:** “Send” requires an actual configured delivery channel for a sent outcome. If not configured, provide an explicit `PREVIEW_ONLY`/failed state, not a false successful-send label. “Print” can use a browser-printable invoice or generated PDF.

### 4.6 Discounts — PDF p.4

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-DISC-01 | Admin-only rules | Only admin can create/edit/disable discount rules |
| FR-DISC-02 | Discount types | Support fixed amount and percentage |
| FR-DISC-03 | Eligibility constraints | Minimum purchase value or quantity; date range; maximum usages |
| FR-DISC-04 | Scope | Specific products and whole-subscription discounts |
| FR-DISC-05 | Automatic invoice application | Applicable rule reduces next invoice automatically, with visible breakdown |
| FR-DISC-06 | Expiry and limits | Expired or exhausted rules never apply; usage consumption is tracked safely |

**Assumption:** To keep computation deterministic for the demo, choose at most one discount at product-line scope and one at subscription scope; define priority/non-stacking behavior in §11. Admin can configure tier-like quantity thresholds with multiple rules.

### 4.7 Payments and receivables — PDF p.4

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-PAY-01 | Record payments | Method, amount, date, note, invoice relationship are stored |
| FR-PAY-02 | Track balances | Invoice displays total, amount paid, remaining balance and payment history |
| FR-PAY-03 | Payment state | Invoice becomes `PAID` when fully settled; unpaid/partially-paid amounts remain outstanding |
| FR-PAY-04 | Overdue tracking | Unpaid invoice with passed due date is visible as overdue |
| FR-PAY-05 | Data integrity | Reject negative/zero payments and payment amounts exceeding outstanding balance unless refunds/credits are explicitly implemented |

**Assumption:** An invoice may receive several partial payments; “Partially Paid” is a derived payment indicator, not necessarily another canonical invoice lifecycle state.

### 4.8 Reporting and performance — PDF p.4

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-REP-01 | Active subscriptions metric | Correct count based on canonical active/paused rules |
| FR-REP-02 | Revenue collected | Sum of recorded successful payments in selected date range |
| FR-REP-03 | Outstanding amount | Sum of unpaid balances of non-cancelled confirmed invoices |
| FR-REP-04 | Overdue invoices | List/count/amount with filters by customer, status, date |
| FR-REP-05 | Overview and filters | Finance view has summary cards, lists, date/customer/status filters |
| FR-NFR-01 | Response time | Relevant pages respond in **under 2 seconds with thousands of subscriptions** in a reproducible seeded test |

**Definitions:** Collected cash, invoiced revenue, MRR, and forecast revenue are **different metrics** and must not be labeled interchangeably.

---

## 5. Competitive differentiators (P1)

These are team additions; they are not requirements explicitly mandated by the PDF.

### 5.1 DF-TM — Subscription Time Machine

**Problem:** Evaluators cannot wait a month to see renewals and automation, while admins need visibility into future billing events.

**User story:** As an admin, I can select a future date or range, preview which subscriptions renew, expire, receive invoices, or lose discounts, then choose to run an authorized billing action for eligible due periods.

**Requirements**

- Date picker: selected future/reference date and 7/30/90-day horizon options.
- **Preview must be read-only**: no invoices, payments, notifications, or changes to real `next_billing_date`.
- Preview lists subscriptions due, estimated invoice amounts, planned closures, and rule expirations, with explanations and counts.
- Clearly separate `PREVIEW` from `EXECUTE`; actual run requires admin confirmation and server authorization.
- Execute operation should call the same idempotent billing engine used by scheduled/manual billing, never a separate invoice-calculation implementation.
- For simulated future dates, either operate on **demo-only seeded data** in an isolated test environment or provide a non-mutating preview. Never advance a real production ledger into the future silently.
- Rerun shows `created`, `already_processed`, `skipped`, and `failed` counts.

**Acceptance:** A repeat preview returns same data without DB writes; duplicate execution does not produce duplicate billing cycles.

**Dependencies:** FR-SUB, FR-BILL, FR-DISC, FR-PLAN.

### 5.2 DF-RADAR — Revenue Leak Radar

**User story:** As a finance user, I can see actionable billing problems before revenue is missed.

**Rule-based detectors (no ML needed):**

1. Active subscription with billing date in the past and no corresponding invoice/processed billing-cycle record.
2. Confirmed unpaid invoice past its due date.
3. Subscription whose required pricing or plan data prevents billing.
4. Optional: invoice amount materially different from a deterministic recomputation, shown as “needs review” not an automatic fraud allegation.

Each finding includes `severity`, `rule`, linked record, explanation, and recommended action. Clicking a finding opens the affected subscription/invoice. Provide refresh and filter-by-severity.

**Acceptance:** Seed at least one known missed-billing and overdue-invoice case and show correct detection; resolved items disappear or become resolved upon recomputation.

**Dependencies:** Invoice history, billing-cycle ledger, reporting queries.

### 5.3 DF-EXPLAIN — Explain My Bill

**User story:** As a customer, I can see why an invoice has its specific total.

Show base/variant price, quantity, plan charge if applicable, eligible discount, taxable subtotal, tax amount, invoice total, payments and outstanding balance. Highlight applicable rule name and next scheduled bill date. Numbers must come from immutable invoice snapshots, not freshly calculated values that can drift.

**Acceptance:** UI arithmetic equals stored invoice total to the currency minor unit; customer can only explain own invoices.

### 5.4 DF-REMIND — Smart renewal reminders

- Configurable reminders at **7, 3, and 1 day** before the next renewal (proposed defaults).
- Eligible active subscriptions only; respect customer preference and valid destination.
- Include subscription, renewal date, summary of expected amount when reasonably determinable, and portal link.
- Deduplicate by `(subscription, cycle, channel, reminder_type)`.
- Record `QUEUED`, `SENT`, `FAILED`, `PREVIEW_ONLY`, with attempts and timestamps.
- Provide in-app notifications even when external delivery is unconfigured.

**Acceptance:** Repeat reminder job does not create duplicate sends; demo notification history accurately shows its delivery mode/status.

### 5.5 DF-EMAIL — Email invoices and alerts

- Provider adapter for configured SMTP or email API; keep credentials in environment variables.
- Send password reset (P0), invoice delivery, renewal reminders, and optional overdue alert.
- Email templates include safe links; no plaintext password or sensitive payment info.
- Provider failure is visible, retryable, and does not change an unpaid invoice to paid.
- If actual email delivery is unavailable, label preview/test mode unambiguously.

### 5.6 DF-TIMELINE — Subscription Activity Timeline

- Record business events: account created (non-sensitive), quotation created/confirmed, subscription activated/paused/renewed/closed, invoice generated/confirmed/cancelled/sent, payment recorded, plan changed, notification sent/failed.
- Entries have timestamp, actor (`user` or `system`), record reference, action type, and human-readable summary.
- Customer view is limited to own subscription events; admin/staff see authorized data.
- Timeline ordered newest first; indexed and paginated.

**Acceptance:** Demo customer subscription shows a coherent history from quotation through payment, including a system-generated invoice event.

---

## 6. Advanced features (P2)

### 6.1 DF-FORECAST — Revenue Forecast Simulator

**Purpose:** Project recurring **billings** for next 1, 3, or 6 months from active subscriptions and expected billing schedules.

- Group future billing cycles by month and estimate amounts with current known prices, valid discounts, and taxes.
- Show expected invoiced value; separately show *collected payments* from actual history.
- Scenario sliders/inputs: customer growth assumption and price adjustment, without mutating live subscriptions.
- Use deterministic projection, no ungrounded AI forecast claims.
- State assumptions clearly: renewals continue unless expiry/closure policy stops them, no future plan changes beyond known schedules, collections not guaranteed.
- Graph projected recurring billings; optionally derive MRR/ARR with documented normalization rules.

**Acceptance:** Zero subscriptions shows zero forecast; changing scenario changes only projected results, not stored subscriptions.

### 6.2 DF-CONSOL — Consolidated Enterprise Invoicing

**Purpose:** Allow one billing account with several subscriptions to receive one invoice for eligible aligned cycles.

- Group subscriptions only if **same billing customer/account, currency, billing date/period, and compatible payment/tax terms**.
- Combine items with per-line source subscription references; retain original pricing, tax and discount breakdowns.
- Mark every source billing cycle processed atomically with invoice creation so it cannot also get an individual invoice.
- One invoice can reference multiple subscriptions; avoid hardcoding `invoices.subscription_id NOT NULL` as the only association.
- Show source subscriptions within the consolidated invoice; allow printable/email delivery.
- Partial payments apply to the consolidated invoice; allocation back to subscriptions is out of baseline scope unless explicitly needed.

**Acceptance:** Three eligible subscriptions produce one invoice with all lines and correct totals; retry produces zero duplicates; non-aligned subscriptions remain separate.

**Risk:** High schema and billing-engine coupling; plan the data model early, code feature only when safe.

### 6.3 DF-SWITCH — Smart Plan Switching

- Customers or staff can request upgrade, downgrade, or seat-count adjustment, subject to policy and minimum quantity.
- Preview current plan vs target plan and predicted **next-cycle** amount.
- Initial implementation: changes take effect **at next billing boundary**; no mid-cycle proration.
- Store pending change with effective date, initiating actor, old/new plan and quantity; apply once when billing boundary is reached.
- Show the pending change in customer portal; optionally cancel it before effective date.
- Record event in Activity Timeline.

**Acceptance:** Preview never changes actual price; next-cycle processing applies pending plan only once and uses new terms for subsequent cycles.

### 6.4 DF-IMPORT — Smart Spreadsheet Migration

**Purpose:** Move Brightloop's spreadsheet-based records into Billora.

- First delivery uses **CSV** (not XLSX) with documented template and supported entities: customers **or** products/subscriptions; prioritize one complete entity import.
- Wizard stages: upload → preview → column mapping → validate → error summary → confirm import.
- Validate required fields, data types, duplicate emails/identifiers, foreign key relationships, and price formats.
- Provide row-level errors and an import summary (`created`, `skipped`, `failed`); no silent partial success.
- Dry-run validation must not modify data.
- Prevent duplicate imports using stable external IDs/dedupe keys when possible.
- Restrict import to admin or authorized internal staff; never accept executable CSV formulas as trusted instructions.

**Acceptance:** A valid sample CSV imports successfully, a malformed row is reported precisely, and a second identical import does not silently duplicate existing records.

---

## 7. Stretch features (P3)

### 7.1 DF-ORG — Parent–child enterprise accounts

- Business **account hierarchy**, not hierarchical pricing plans.
- One-level parent-child relationship initially; parent authorized billing manager can view linked children’s invoices/subscriptions/usage.
- Child accounts retain data isolation from unrelated organizations.
- Parent visibility does not automatically authorize refunds, plan modification, or payment actions without explicit role policy.
- Consolidation uses explicit billing account ownership, not merely visual hierarchy.

### 7.2 DF-USAGE — Usage and seat limits

- Initial usage unit is **seats**, not arbitrary API calls/storage.
- Store plan seat limit, purchased/allocated seats, and use; validate no more than allowed.
- Warn at configurable threshold (e.g., 80%); show usage history and upgrade action.
- Seed real seat-assignment records/events; avoid hardcoded pretend usage numbers.

### 7.3 DF-WHATSAPP — WhatsApp alerts

- Notification provider interface supporting WhatsApp as an optional channel.
- Actual delivery only when WhatsApp Business API, recipient consent, and required message templates are operational.
- For hackathon without approved credentials, show **preview or unavailable** state only; do not claim delivery.
- Never hard-code credentials or message recipients into the repository.

---

## 8. End-to-end user journeys

### Journey J1: New customer → first invoice → payment

1. Customer registers with valid email/password; backend ensures unique email and correct role.
2. Admin creates product, optional variant, plan, tax and discount rules.
3. Staff chooses customer and quotation template, adjusts line items, sends quotation or advances it.
4. Quotation is confirmed and subscription transitions to `ACTIVE` with a next billing date.
5. Billing engine identifies due cycle and creates a draft invoice with correct snapshot totals.
6. Staff confirms and sends/prints invoice.
7. Staff records a payment linked to the invoice; invoice balance becomes zero and status becomes `PAID`.
8. Customer views invoice, payment history and Explain My Bill; finance overview updates.

**Demo proof:** All records and amounts reflect the same underlying data, not disconnected mocks.

### Journey J2: Automatic renewal and no double billing

1. Seed/create an active monthly subscription due on chosen date.
2. Open Time Machine preview; see upcoming renewal and estimated bill.
3. Run authorized billing for the due period in demo environment.
4. Confirm invoice created and `next_billing_date` advances.
5. Repeat same action; see `already_processed` or equivalent; zero duplicate invoices.
6. Activity Timeline shows system event; renewal reminder history is visible if enabled.

### Journey J3: Quantity discount

1. Admin defines a 10% discount for at least 25 seats within an eligibility window and limited redemptions.
2. Staff creates subscription with 30 units and an applicable product.
3. Billing engine calculates line/overall discount and appropriate tax.
4. Invoice shows discount, quantities and final amount.
5. Rerun does not consume another discount use for the same bill.
6. New invoice after expiration or redemption exhaustion does not receive discount.

### Journey J4: Enterprise consolidated invoice (P2)

1. Enterprise billing account owns several compatible active subscriptions.
2. Preview shows grouped billing for aligned cycles.
3. Billing job generates one invoice with traceable lines from each source subscription.
4. Payment reduces one consolidated balance; customer can inspect contributing subscriptions.
5. Replay does not create individual duplicates.

### Journey J5: Customer self-service and plan change (P2)

1. Customer logs in and sees own subscriptions/invoices only.
2. Customer views next renewal and allowed plan actions.
3. Customer previews new plan/quantity and next invoice total.
4. System queues next-cycle change and displays effective date.
5. Timeline records request and application; next eligible invoice uses changed plan.

---

## 9. Business state machines

### 9.1 Subscription

Required principal progression:

```text
DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
```

Additional controlled transitions:

- `ACTIVE -> PAUSED -> ACTIVE` if plan allows pause/resume.
- `ACTIVE -> CLOSED` if early close allowed, or automatic expiry policy applies.
- `ACTIVE -> ACTIVE` with renewal/extension event if plan permits renewal.
- An expired quotation cannot be confirmed until renewed/reissued.
- Closed subscriptions cannot be billed for new periods after effective closure (historical invoice records remain).

**Implementation choice:** Prefer `status` plus a `paused_at`/`pause_reason` or explicit `PAUSED` status, but make all code agree on one source of truth.

### 9.2 Invoice

```text
DRAFT -> CONFIRMED -> PAID
   \         \
    +-> CANCELLED <-+
```

- `send` and `print` are **actions**, not financial states.
- `PARTIALLY_PAID` is a derived settlement label; invoice remains `CONFIRMED` until balance reaches zero.
- Cancelled invoices are excluded from outstanding amounts; cancellation after payment requires a separate reversal/refund policy and is **not in baseline scope**.

### 9.3 Notifications

```text
QUEUED -> SENT
   |        
   +-> FAILED -> RETRY_QUEUED
   +-> PREVIEW_ONLY (when delivery not configured)
```

Notification delivery and invoice financial state must be decoupled.

### 9.4 Import (P2)

```text
UPLOADED -> VALIDATED -> CONFIRMED -> COMPLETED / COMPLETED_WITH_ERRORS / FAILED
```

Dry-run checks do not mutate records.

---

## 10. Data requirements and conceptual entities

The exact SQL schema belongs in `ARCHITECTURE.md`; this is the minimum product-level data model and its cross-feature constraints.

| Entity | Minimum important fields / relationships |
|---|---|
| `users` | id, email (unique), password hash, role, account/customer link, created_at |
| `accounts` (recommended) | id, name, billing details; optional parent account ID for P3 |
| `products` | id, name, type, sales_price, cost_price, notes, active |
| `product_variants` | id, product_id, option name/value, price_adjustment |
| `plans` | id, name, billing interval, plan price, minimum quantity, available_from/to, auto_close, can_pause, can_renew, can_close_early |
| `tax_rules` | id, name, rate, applicable scope, active/effective dates |
| `discount_rules` | id, type/value, min_qty/min_amount, start/end, maximum_uses, scope, priority, active |
| `discount_redemptions` | rule_id, invoice or billing-cycle ref, applied amount, redeemed_at; protect from double consumption |
| `quotation_templates` | id, name, plan_id, validity_days, owner; template line association |
| `quotation_template_lines` | product/variant, quantity, base unit price/tax references |
| `subscriptions` | id, unique number, account_id/customer_id, plan_id, start/expiry, status, terms, next_billing_date, billing anchor |
| `subscription_lines` | id, subscription_id, product/variant, quantity, unit price, tax scope, line amount |
| `billing_cycles` | id, subscription_id, period_start/end, status, invoice_id; **unique subscription + period** |
| `invoices` | id, invoice number, billing account, issue/due dates, state, subtotal, discount, tax, total, paid balance, currency |
| `invoice_lines` | id, invoice_id, **source_subscription_id**, source_subscription_line_id (nullable where needed), description, qty, frozen price/discount/tax/totals |
| `payments` | id, invoice_id, amount, method, paid_at, note, recorded_by |
| `audit_events` | id, entity type/id, event type, actor, summary payload, created_at |
| `notifications` | id, account/customer/subscription/invoice link, channel, template, cycle, status, attempts, timestamps |
| `pending_plan_changes` (P2) | subscription, from/to plan, quantity, effective date, requested_by, status |
| `imports` / `import_rows` (P2) | uploader, file metadata, validation result, row-level status/error |
| `seat_assignments` (P3) | subscription, seat/user, allocated_at, active flag |

### 10.1 Essential database constraints

- Unique normalized user email; unique subscription number and invoice number.
- Foreign keys required and enabled in SQLite.
- Money and quantities validated nonnegative where appropriate.
- `billing_cycles`: unique `(subscription_id, period_start, period_end)`.
- Invoice and cycle creation and `next_billing_date` updates use one transaction; retry must not duplicate.
- For consolidated billing, **one invoice can own lines from many subscriptions** via `invoice_lines.source_subscription_id` / `billing_cycles.invoice_id`.
- Index subscriptions by `(status, next_billing_date)`, invoices by `(status, due_date)`, records by account/customer foreign key, events by `(entity_type, entity_id, created_at)`.
- Avoid storing live app DB files in Git; use migrations/seed scripts.

---

## 11. Pricing, billing and financial rules

The source PDF demands correct automatic billing but does not fix all calculation conventions. These are **team assumptions** to make implementation deterministic; keep this section synchronized with code/tests.

### 11.1 Currency and precision

- Demo currency defaults to **INR**; multi-currency support is not required by the PDF.
- Store currency code and integer minor units or precise Decimal representation.
- Round only at documented steps; use consistent currency rounding for tax/discount.

### 11.2 Price building

For a billable line:

```text
base_unit_price = configured line/product price (or applicable plan fee)
variant_adjusted_unit_price = base_unit_price + selected_variant_delta
line_gross = variant_adjusted_unit_price * quantity
line_discount = eligible fixed or percentage reduction (clamped to line_gross)
line_taxable = line_gross - line_discount
line_tax = line_taxable * applicable_tax_rate, rounded per invoice rule
line_total = line_taxable + line_tax
```

**Avoid double charging:** Treat plan recurring base fee as a distinct line **only if configured to bill separately**; otherwise the plan represents scheduling/policy while product lines determine charge. Explicitly show all billable lines before confirmation.

### 11.3 Discount policy assumptions

- Evaluate active date window and usage cap at bill creation/confirmation as defined in implementation.
- Min quantity/purchase thresholds apply to the configured rule scope.
- Apply product-scope discount to eligible product lines; subscription-scope discount to remaining eligible subtotal.
- Do **not** stack multiple rules at the same scope in MVP; choose highest-priority eligible rule, tie-break with biggest valid saving, then stable ID.
- For fixed amount, cap savings at amount eligible; never create a negative taxable subtotal.
- Consume limited discount use **once** for a finalized invoice/billing-cycle, not for read-only preview or a job retry.

### 11.4 Billing cycles

- Bill only subscription(s) eligible by status, plan policy, effective start/expiry, and `next_billing_date`.
- Intervals: daily, weekly, calendar monthly, calendar yearly.
- Preserve a **billing anchor** for month-end dates; e.g. Jan 31 → Feb last day → Mar 31, rather than permanently drifting to Mar 28.
- Use application/business timezone **Asia/Kolkata** consistently for demo date boundaries, while storing timestamps in UTC where possible.
- Respect plan closing/renewal rules: decide whether a last partial cycle is billed by explicit policy; default is **no automatic prorated final invoice**.
- Process missed eligible cycles deterministically (subject to expiry); protect each with a billing-cycle unique key.
- A repeated invocation yields same financial outcome.
- Billing and notification failures are independently visible; emailing an invoice must not be prerequisite for generating/confirming it.

### 11.5 Payment and revenue definitions

```text
invoice_balance = invoice_total - sum(successfully_recorded_payments)
paid = (invoice_balance == 0) AND (invoice.status != CANCELLED)
overdue = (invoice_balance > 0) AND (due_date < today) AND (invoice is collectible)
collected_revenue = sum(payments recorded in selected range)
outstanding_receivables = sum(positive balances of collectible confirmed invoices)
```

- Partial payments reduce balance; no negative balance or overpayment in baseline.
- `MRR`/`ARR` (P2) represent recurring billing value normalized by period, **not** recorded cash payments; name charts accordingly.

---

## 12. Automation service specification

| Automation | Trigger | Preconditions | Action | Idempotency/dedupe |
|---|---|---|---|---|
| Due billing (P0) | Manual admin run; scheduled job | Active, eligible, next billing date due | Create billing cycle and invoice snapshot; advance due date | Unique `(subscription, period)` + transaction |
| Plan auto-close (P0) | Daily or before billing | Expired and auto-close enabled | Close subscription; write event | No-op once closed |
| Auto-discount (P0) | Invoice calculation | Rule eligibility true | Freeze discount on invoice | One redemption per invoice/rule |
| Payment settlement (P0) | Payment recorded | Valid positive balance/payment | Update invoice derived balance/state | Payment ID unique, transaction |
| Renewal reminders (P1) | Scheduled job/manual test | 7/3/1 day pre-due, opted-in | Queue/send notification | Unique subscription + cycle + channel + reminder |
| Leak scan (P1) | Refresh or scheduled scan | Query records | Return actionable findings | Stable finding IDs for same condition |
| Plan change application (P2) | Billing boundary | Authorized pending change due | Replace future plan/quantity, log event | Change request applied once |
| Enterprise consolidation (P2) | Billing job | Eligible subscription grouping | Create grouped invoice and cycle links | Unique source cycles in transaction |

**Job execution choice:** For hackathon reliability, a callable admin endpoint and one in-process scheduler are acceptable. Do not run multiple independent schedulers on every hot-reload/worker without coordination. Manual invocation must use the same core service as the scheduled job.

### 12.1 Suggested API result for billing jobs

```json
{
  "run_id": "run_001",
  "effective_date": "2026-10-31",
  "preview": false,
  "due_cycles": 12,
  "created_invoices": 10,
  "already_processed": 2,
  "skipped": 0,
  "failed": 0,
  "total_invoice_amount_minor": 1542000
}
```

The numbers above are **illustrative contract values**, not observed application performance.

---

## 13. Screen inventory and navigation

### 13.1 Shared shell

- Authenticated app shell with role-specific navigation; responsive sidebar and header.
- Search and quick filters, status tags, loading skeletons, empty states, form error messages, non-destructive success messages.
- Consistent currency/date formatting and accessible keyboard focus states.

### 13.2 Admin and staff pages

| Screen | Primary interactions | Priority | Proposed UI owner |
|---|---|---|---|
| Dashboard / Overview | Active subscriptions, collected revenue, outstanding, overdue, quick links | P0 | Abhishikth |
| Products & Variants | Create/edit/list; price adjustments; validations | P0 | Abiya |
| Subscription Plans | Configure interval, min qty, availability, pause/renew/close policies | P0 | Abiya |
| Taxes & Discounts | Admin-only rules, applicability, tier thresholds, redemptions | P0 | Abiya |
| Customers | Search/list customer accounts | P0 | Abhishikth or Abiya by file ownership |
| Quotation Templates | Create line templates, quote validity settings | P0 | Abiya |
| Quotations | From template, edit, confirm/convert | P0 | Abiya |
| Subscriptions | Create/manage states, details, lines, dates, actions | P0 | Abhishikth |
| Invoices | List/detail, confirm/cancel, send, print | P0 | Abhishikth |
| Payments | Record payment, view balance/history | P0 | Abhishikth |
| Financial Reports | Summary + date/status/customer filters | P0 | Abhishikth |
| Automation Center / Time Machine | Preview/run billing, run summaries | P1 | Abhishikth |
| Revenue Leak Radar | Risk cards, filters, record drill-down | P1 | Abiya |
| Activity Timeline | Filterable event stream | P1 | Abiya |
| Notifications | Reminder history, delivery status | P1 | Abiya |
| Revenue Forecast | Projected billing chart, scenario controls | P2 | Abhishikth |
| CSV Import Wizard | Upload, mapping, validate, import | P2 | Abiya |
| Enterprise Billing | Consolidation preview/details | P2 | Abhishikth |
| Organization & Usage | Parent-child access, seats/utilization | P3 | Abiya |

### 13.3 Customer portal

- **Home:** current subscriptions, next renewal, outstanding balance, latest invoices.
- **My Subscriptions:** plan, status, line items, dates, allowed pause/close/renew actions.
- **My Invoices:** invoice history, state, due date, print/download, Explain My Bill (P1).
- **Notifications:** renewal messages and delivery preferences (P1).
- **Change Plan:** plan/quantity comparison and scheduled switch (P2).
- **Account:** profile and password reset/change.

**Design note:** `DESIGN.md` will specify brand tokens and component patterns. Suggested direction from team discussion: light-first, financially readable Stripe-like surfaces, compact Linear-like information density, and Airtable-like data tables. These are **style references**, not licenses to clone branding.

---

## 14. API contract surface (proposed, not official)

Define response types in a shared contract early so frontends can use typed mocks while Adithya implements APIs. Endpoint names can change, but any change must be communicated to both frontend owners.

### 14.1 Auth and users

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
POST /api/admin/staff
```

### 14.2 Catalog and rules

```http
GET,POST /api/products
GET,PATCH /api/products/{id}
GET,POST /api/plans
GET,PATCH /api/plans/{id}
GET,POST /api/taxes
GET,POST /api/discounts
```

### 14.3 Quotations and subscriptions

```http
GET,POST /api/quotation-templates
GET,POST /api/quotations
POST     /api/quotations/{id}/confirm
GET,POST /api/subscriptions
GET      /api/subscriptions/{id}
POST     /api/subscriptions/{id}/transition
```

### 14.4 Invoices and payments

```http
GET       /api/invoices
GET       /api/invoices/{id}
POST      /api/invoices/{id}/confirm
POST      /api/invoices/{id}/cancel
POST      /api/invoices/{id}/send
GET       /api/invoices/{id}/print
POST      /api/payments
GET       /api/invoices/{id}/payments
```

### 14.5 Reports and differentiators

```http
GET  /api/reports/summary
GET  /api/reports/overdue
POST /api/billing/preview
POST /api/billing/run              # admin authorization; demo-aware
GET  /api/alerts/revenue-leaks
GET  /api/events                   # scoped to authorized entities
GET  /api/notifications
GET  /api/forecast                 # P2
POST /api/imports/validate        # P2
POST /api/imports                 # P2
POST /api/subscriptions/{id}/plan-change/preview  # P2
POST /api/subscriptions/{id}/plan-change          # P2
```

### 14.6 Consistent response conventions

- List endpoints use `page`, `page_size`, optional `sort`, `filters`, and return `items` + `total` + pagination metadata.
- Errors use a stable JSON structure, e.g. `{ "code": "FORBIDDEN", "message": "...", "details": {} }`.
- Dates use ISO 8601; timestamps specify timezone/UTC; currencies specify currency code and minor-unit integer amounts.
- Never trust client-supplied total, discount saving, or role; recalculate/authorize server-side.
- Use an `Idempotency-Key` on mutation endpoints when relevant, especially payment import and billing actions.

---

## 15. Non-functional requirements

| Area | Requirement | Proof / test |
|---|---|---|
| Performance | Pages respond under 2 seconds at thousands of subscriptions, as stated in PDF | Seed 5,000 subscriptions; time dashboard, subscription list, invoice list under documented local conditions |
| Query efficiency | Use pagination and indexed filters; avoid loading full invoice/line graph for list pages | Inspect SQL/query times and response sizes |
| Correctness | Billing idempotent; calculations deterministic; transactions guard shared financial updates | Double-run and concurrent/retry tests |
| Security | Authenticated sessions, strong hash, admin-only protected mutations, tenant isolation | 401/403 and cross-account tests |
| Reliability | Clear failures; safe retries for notification/billing/import workflows | Simulated provider failure and repeated invocation |
| Usability | Responsive navigation, human-friendly errors, loading, empty states | Manual keyboard/mobile check |
| Accessibility | Semantic controls, focus visibility, labels, contrast, readable tables | Keyboard and basic accessibility checks |
| Auditability | User/system actions recorded for critical transitions | Inspect timeline/audit event rows |
| Local setup | One documented backend/frontend setup, seed demo data, no need for live payment gateway | Fresh clone setup verified on teammate machine |
| Secrets | `.env.example` committed; `.env`, tokens, `.db` ignored | Git status/repo scan |

### 15.1 Performance-test protocol

- Use a fixed fixture script that generates at least **5,000 subscriptions**, related invoices and payments.
- Measure API response and full page interactivity separately, in local browser and backend logs.
- Target <2 seconds on representative list and reporting paths; record actual measurements in README.
- Do not claim the target is met unless it has been measured.

---

## 16. Acceptance and edge-case test matrix

| Test ID | Scenario | Expected |
|---|---|---|
| T-01 | Register same email twice | Duplicate rejected despite casing differences |
| T-02 | Password exactly 8 chars | Rejected; requirement is **more than** 8 |
| T-03 | Password lacks uppercase/lowercase/special | Rejected with useful validation |
| T-04 | Password reset token expired or reused | Reset denied |
| T-05 | Staff tries to create staff or discount rule | 403 Forbidden |
| T-06 | Customer reads someone else's invoice by ID | 403/404, no data disclosed |
| T-07 | Product variant `Odoo +560` | Correct unit and extended line total |
| T-08 | Plan `min_qty=5`, subscription qty 4 | Validation rejected |
| T-09 | Unavailable plan selected | Rejected |
| T-10 | Quotation template validity expired | Cannot confirm without renewal |
| T-11 | Invalid status transition `DRAFT -> PAID` | Rejected |
| T-12 | Paused or closed subscription reaches billing date | No inappropriate new invoice |
| T-13 | Run same billing cycle twice | One invoice/billing-cycle record only |
| T-14 | Subscription overdue for two valid cycles | Both valid missed cycles processed once |
| T-15 | Jan 31 monthly anniversary | Correct Feb month-end then Mar 31 behavior |
| T-16 | Product-specific percentage discount meets quantity threshold | Applied correctly to eligible line |
| T-17 | Expired or exhausted discount | Not applied |
| T-18 | Billing preview or retry | Does not consume discount usage twice |
| T-19 | Tax computed after discount per assumed policy | Rounded correct total |
| T-20 | Payment below invoice balance | Correct partial balance; not Paid |
| T-21 | Final payment settles invoice | Status becomes Paid, balance zero |
| T-22 | Payment exceeds balance | Rejected |
| T-23 | Unpaid confirmed invoice past due | Appears overdue and in Radar |
| T-24 | Cancelled invoice | Excluded from receivables and cannot accept normal payment |
| T-25 | Revenue metric vs invoice totals | Cash collected derived from payments, not invoice creation |
| T-26 | Time Machine preview | No DB mutation |
| T-27 | Repeated reminder trigger | One notification per cycle/type/channel |
| T-28 | Email provider unavailable | Accurate failure/preview status; no invented delivery |
| T-29 | Timeline for customer | Only events for owned records visible |
| T-30 | CSV malformed / duplicate row (P2) | Row-level error; preview is read-only |
| T-31 | Three compatible subscriptions consolidated (P2) | One invoice, three source cycle links, no duplicate |
| T-32 | Plan change scheduled (P2) | No immediate charge change; applied once at boundary |
| T-33 | 5,000 seeded subscriptions | Relevant pages measured <2 seconds or documented blocker |

---

## 17. Demo data and demo script

### 17.1 Deterministic seed dataset

- One admin, one staff user, two unrelated customer accounts, one enterprise customer (optional).
- Product examples: CRM, Helpdesk, Inventory; Odoo-brand variant with `+560` price adjustment.
- Monthly, yearly and weekly plans; one has pause/renewal policy restrictions.
- One active subscription currently due, one upcoming renewal, one past due with no invoice, one closed subscription.
- One discount qualifying by 25+ seats, and one expired discount.
- One unpaid invoice, one partially paid invoice, one paid invoice, and one overdue invoice.
- Notifications and audit events generated through actions, not arbitrary unsourced UI-only counters.
- Separate scale-seeding command for performance testing; keep demo seed small/readable.

### 17.2 Functional demo video (maximum 5–6 minutes; repository portal instructions prevail)

| Target segment | Showcase |
|---|---|
| 0:00–0:40 | Login as admin; show real dashboard and role-specific navigation |
| 0:40–1:30 | Create product + variant; configure plan, tax and automatic quantity discount |
| 1:30–2:20 | Create quotation from template; activate subscription |
| 2:20–3:30 | Open Time Machine; preview due invoices; run safe billing and rerun to prove no duplicate |
| 3:30–4:15 | Open invoice; Explain My Bill; record payment and see balance/dashboard update |
| 4:15–5:15 | Show Leak Radar, Activity Timeline, reminder/email notification status |
| Optional remaining | Forecast chart or enterprise combined invoice **only if actually working** |

Always prioritize a real functional flow over explaining architectural diagrams in the recorded video.

---

## 18. Delivery plan for the eight-hour virtual round

This is a **target**, subordinate to the official portal milestones. All times IST.

| Window | Release gate | Minimum evidence |
|---|---|---|
| **9:00–9:25** | Scope freeze / repository setup | Problem selected; GitHub public repo ready; agreed contracts and module ownership |
| **9:25–10:00** | Repository submission gate | Repo URL submitted before 10:00; evaluator/mentor access; meaningful first commits from all three |
| **10:00–11:15** | Gate A: Auth + catalog | Login/roles, products, variants, plans, base UI shell and data persisted |
| **11:15–12:45** | Gate B: Subscription lifecycle | Quotation template → quote → confirmed/active subscription from actual API/database |
| **12:45–2:15** | Gate C: Financial core | Due billing, idempotency, taxes/discounts, invoice states, payments |
| **2:15–3:15** | Gate D: Reports + signature demo | Dashboard, Time Machine preview/run, Leak Radar/timeline groundwork |
| **3:15–4:00** | Stabilization | Auth/isolation/financial edge cases, performance spot-check, email/reminder as feasible |
| **4:00–5:00** | Final release + video | Freeze new features, verify clean setup, record <=6-min functional demo, final commits |

### 18.1 Feature cut order if delayed

1. Keep **all P0 workflows** in scope; focus implementation on a demonstrable end-to-end vertical slice rather than isolated pages.
2. Preserve Time Machine **preview + safe replay** if core engine already works (highest differentiation per unit of integration effort).
3. Add Revenue Leak Radar, Activity Timeline, Explain My Bill by reusing existing data.
4. Add notifications/email with real/test delivery clearly labeled.
5. Attempt Forecast, Consolidated Invoicing, Smart Switching, CSV Migration only in that order **or as dependencies permit**.
6. Treat hierarchy, usage enforcement, WhatsApp as stretch; never destabilize invoicing for them.

### 18.2 Definition of MVP-complete

- An admin can configure a product/variant, plan, tax and discount.
- A quotation can be created from template and converted into an active subscription.
- The billing service can create a correct invoice from real database records; a retry does not create a duplicate.
- A payment can settle the invoice and update finance reporting.
- A customer can sign in and inspect only their own invoice/subscription.
- Core required state transitions, input validation, and staff/admin restrictions are enforced server-side.

P1/P2 features improve this MVP; they do not replace it.

---

## 19. Team ownership, concurrency and Git policy

### 19.1 Code ownership

| Member | Primary ownership | Independent, meaningful code deliverables |
|---|---|---|
| **Abhishikth** | Frontend platform, customer-facing flows and high-complexity visualization/integration | App shell, auth/customer portal UI, subscription/invoice/payment screens, dashboard, Time Machine UI, Explain My Bill, Revenue Forecast/Plan Switch UI if capacity |
| **Adithya** | Backend, DB, financial correctness and automation | SQLAlchemy models/migrations, auth/RBAC, REST contracts, lifecycle services, invoice engine, taxes/discounts, payments, reminder jobs, consolidation/forecast computation if capacity |
| **Abiya** | Admin/staff functional modules and independently shipped frontend features | Products/variants, plans, taxes/discounts, quotation templates/quotation screens, Leak Radar UI, Activity Timeline, Notifications, CSV Migration UI, Enterprise pages if capacity |

**Important:** Abiya is a feature owner, not a tester/documentation-only contributor. All three should be able to explain the code they personally authored.

### 19.2 Suggested file boundaries

```text
billora/
├── frontend/
│   └── src/
│       ├── app/                    # Abhishikth: app shell, routes, layouts
│       ├── components/shared/      # Abhishikth: stable reusable UI
│       ├── features/customer/      # Abhishikth
│       ├── features/subscriptions/ # Abhishikth
│       ├── features/billing/       # Abhishikth
│       ├── features/dashboard/     # Abhishikth
│       ├── features/admin/         # Abiya
│       ├── features/quotations/    # Abiya
│       ├── features/revenue-radar/ # Abiya
│       ├── features/activity/      # Abiya
│       ├── features/notifications/ # Abiya
│       └── features/import/        # Abiya
├── backend/                        # Adithya
├── contracts/                      # Shared API types; coordinated changes
├── docs/                           # PRD, architecture, design, decisions
├── README.md
└── .env.example
```

`frontend/src/app`, shared styles/components, lockfiles, `contracts/`, and backend schema are **shared integration hot spots**: assign an explicit edit owner; do not change them simultaneously in multiple Codex sessions.

### 19.3 Git requirements from hackathon guidance

- Submit a **public GitHub repository before 10 AM** through the portal; add evaluator/mentor as instructed.
- The participant document says the code should be in **a single branch**, and the email says latest code in **`main`**. Use one shared `main` branch and file ownership for this event.
- Each teammate should commit **their own authored code** using their own verified Git identity and push at least once each hour; aim for 20–30-minute meaningful commits.
- Before push: stage only owned files, commit, `git pull --rebase origin main` (clean tree), resolve issues, push. Never force-push shared `main`.
- Do not make empty/meaningless commits purely to inflate counts; commit logically complete changes with descriptive messages.
- Keep sample records and seed scripts, not live DB files or secrets.

### 19.4 Integration contract

- Backend publishes request/response examples and enums first.
- UI owners may use temporary typed mocks but must replace them before claiming a screen complete.
- Each feature has API integration, client/server validation, loading/error/empty state, and evidence of functioning persistence.
- If backend bottlenecks, prioritize end-to-end endpoints for the demo flow rather than breadth of isolated CRUD routes.

---

## 20. Decisions and assumptions requiring team confirmation

| Decision | Proposed choice | Why / risk |
|---|---|---|
| Product name | **Billora** | Confirmed by team |
| Demo business | **Brightloop Software** | Preserves official scenario |
| Frontend | React + Vite + TypeScript + Tailwind | Concurrent UI development |
| Backend | FastAPI + SQLAlchemy (unless Adithya prefers Express substantially) | Straightforward data/API/business logic |
| Database | SQLite for local hackathon | Zero separate server setup; test constraints/indexes |
| Email | Configured SMTP/API for actual delivery, otherwise labeled preview | Avoid fake sends; provider setup risk |
| WhatsApp | P3 optional | External approval and consent risk |
| Payment | Manual/recorded, no gateway | Matches problem scope |
| Currency | INR default; schema stores currency | Assumption; original PDF does not specify |
| Tax order | Apply discount before tax | Assumption; consistent invoice snapshots |
| Discount stacking | One best rule per scope + deterministic priority | Keeps computations explainable |
| Pause behavior | No invoices while paused; resume schedule policy documented | PDF allows pausing but does not specify proration |
| Month-end billing | Preserve billing anchor | Avoid schedule drift |
| Plan switch | Next billing boundary, no immediate proration | P2 complexity control |
| Parent-child | Account relationships, not nested pricing plans | Matches teammate use case |
| Consolidation | Only same billing account/compatible terms/date | Avoid mixing unrelated billing cycles |
| Performance | Measure on 5,000 seeded subscriptions | Source says “thousands,” not specific fixture |
| Roles | Admin, staff, customer | Exact staff access is our least-privilege proposal |
| Runtime | Single-repo local frontend/backend; no Docker required | Setup speed |

If the team changes any of these, record a short `docs/DECISIONS.md` entry and update relevant tests/contracts.

---

## 21. Known risks and mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Backend owner overloaded by many interdependent features | High | Implement vertical-slice APIs first; prioritize FR-BILL correctness; freeze shared contracts early |
| Over-scoping P1/P2 features | High | Release gates and cut order; no advanced features until P0 path works |
| Consolidation schema conflicts with P0 invoice model | High | Introduce `billing_cycles` and source subscription references on invoice lines from day one; defer actual consolidation |
| Repeated jobs duplicate invoices or discounts | High | Unique cycle constraints, transactions, replay tests |
| Fake notifications or simulated metrics mislead evaluator | High | Label preview modes; use seeded DB records and true calculations |
| Customer sees another customer's financial data | High | Query-level ownership checks and explicit cross-account tests |
| SQLite concurrency/locking on multi-laptop demo | Medium | Run one shared backend instance; each teammate develops against API; avoid copying DB as Git-shared artifact |
| Missing quote/discount edge case | Medium | Cover named PDF scenarios with test matrix; seed deterministic cases |
| UI integration conflict on shared `main` | Medium | File ownership; one owner for routes/global CSS/types; frequent pull/rebase |
| External email/WhatsApp approval delay | Medium | Provider-agnostic adapters, in-app notification history, accurate delivery statuses |
| Video not accessible | Medium | Verify public/anyone-with-link access in incognito; <=6 minutes, functional flow only |

---

## 22. Requirements traceability to original problem statement

| Official PDF location | Source scene | PRD coverage |
|---|---|---|
| **p.1** | The Challenge / Meet Brightloop Software | §§1–2, §8 |
| **p.2** | A new customer signs up | FR-AUTH-01–07, §3, T-01–06 |
| **p.3** | Launching a new plan | FR-CAT-01–04, FR-PLAN-01–04, T-07–09 |
| **p.3** | Turning a quote into a subscription | FR-QUOTE-01–03, FR-SUB-01–05, T-10–12 |
| **p.3** | Billing day | FR-BILL-01–08, §11–12, T-13–15 |
| **p.4** | A customer asks for a better price | FR-DISC-01–06, T-16–19 |
| **p.4** | The money comes in | FR-PAY-01–05, T-20–24 |
| **p.4** | The finance lead, at the end of the month | FR-REP-01–05, FR-NFR-01, T-25/T-33 |

**Note:** Some pages/scenes are summarized into explicit acceptance criteria that are implementation interpretations. Extras DF-* are clearly identified as team proposals, not official scoring requirements.

---

## 23. Implementation coverage checklist

Update status in this table during the event. Accepted status values: `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `BLOCKED`.

| Area | Priority | Owner | Status |
|---|---|---|---|
| Authentication + RBAC + reset flow | P0 | Adithya backend / Abhishikth UI | NOT_STARTED |
| Product + variants | P0 | Adithya API / Abiya UI | NOT_STARTED |
| Plans + policies | P0 | Adithya API / Abiya UI | NOT_STARTED |
| Taxes + discount engine | P0 | Adithya engine / Abiya rules UI | NOT_STARTED |
| Quotation templates + states | P0 | Adithya API / Abiya UI | NOT_STARTED |
| Subscription lifecycle | P0 | Adithya API / Abhishikth UI | NOT_STARTED |
| Automated invoices + idempotency | P0 | Adithya engine / Abhishikth UI | NOT_STARTED |
| Payment recording and balances | P0 | Adithya API / Abhishikth UI | NOT_STARTED |
| Dashboard + overdue reporting | P0 | Adithya queries / Abhishikth UI | NOT_STARTED |
| Performance seeded test | P0 | Adithya + whole team | NOT_STARTED |
| Billing Time Machine | P1 | Adithya backend / Abhishikth UI | NOT_STARTED |
| Revenue Leak Radar | P1 | Adithya queries / Abiya UI | NOT_STARTED |
| Explain My Bill | P1 | Adithya breakdown / Abhishikth UI | NOT_STARTED |
| Renewal reminders + email delivery | P1 | Adithya backend / Abiya notification UI | NOT_STARTED |
| Activity Timeline | P1 | Adithya events / Abiya UI | NOT_STARTED |
| Revenue Forecast | P2 | Adithya projections / Abhishikth UI | NOT_STARTED |
| Consolidated invoicing | P2 | Adithya engine / Abhishikth UI | NOT_STARTED |
| Smart plan switching | P2 | Adithya API / Abhishikth UI | NOT_STARTED |
| CSV migration | P2 | Adithya import API / Abiya UI | NOT_STARTED |
| Parent-child accounts | P3 | Adithya models / Abiya UI | NOT_STARTED |
| Usage limit tracking | P3 | Adithya API / Abiya UI | NOT_STARTED |
| WhatsApp adapter | P3 | Adithya integration / Abiya UI | NOT_STARTED |

---

## 24. Final handoff criteria

The project is ready to demonstrate when:

- [ ] Core source-requirement scenario works end-to-end against persistent data.
- [ ] Billing job is retry-safe and passes no-duplicate/no-skipped-cycle tests.
- [ ] Discounts, variants and taxes produce correct explainable invoice totals.
- [ ] Roles and customer ownership are enforced on backend endpoints.
- [ ] Staff can record a payment and reporting reflects the actual balance.
- [ ] At least one automation differentiator works and is honestly labeled.
- [ ] UI handles desktop and mobile viewports with meaningful loading/error states.
- [ ] Seed/demo setup can run from README in a clean environment.
- [ ] Actual performance measurements are recorded, including limitations if any.
- [ ] Every team member has meaningful, attributable commits on `main`.
- [ ] Repository URL is submitted to the event portal and evaluator access is correct.
- [ ] Functional demo video is accessible and within the event's 5–6-minute maximum.

---

## 25. Companion documents

Use this PRD as the **product behavior and acceptance** source of truth. Keep implementation details separated to avoid contradictory instructions:

- **`ARCHITECTURE.md`** — finalized schema, migrations, architecture diagram, file ownership, API schemas, billing transactions, scheduler setup.
- **`DESIGN.md`** — Billora's exact tokens, typography, responsive rules, sidebars, tables, charts, form patterns, status treatments; one unified design system.
- **`README.md`** — setup instructions, environment variables, seed demo, run commands, test commands, video/repo links.
- **`docs/DECISIONS.md`** — short record of changed assumptions and tradeoffs.
- **`docs/TEST_PLAN.md`** (optional) — test data, automation edge cases, performance evidence.

### Instructions for AI coding assistants

1. Read `PRD.md` before implementing features; differentiate P0 from P1/P2/P3.
2. Preserve official lifecycle rules and required fields; don't simplify away problem statement details without recording a deliberate scope change.
3. Read `DESIGN.md` before modifying UI and `ARCHITECTURE.md` before altering schema/endpoints.
4. Work only in the assigned owned directories unless explicitly coordinating a shared-file change.
5. Implement server-side authorization, validation, precise financial math, and idempotency; do not fake behavior or external message delivery.
6. Add focused tests for financial and security changes; leave application runnable.
7. Do not commit `.env`, credentials, live SQLite DB, node_modules, virtualenvs, or generated secrets.

---

**End of PRD — Billora v1.0**
