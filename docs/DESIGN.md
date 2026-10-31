---
version: "1.0"
name: Billora Design System
product: Billora — Intelligent Subscription, Billing & Revenue Automation Platform
style_direction: "Stripe-inspired financial clarity × Linear-inspired product-workflow density"
theme: light-first
status: hackathon-implementation-specification
primary_color: "#5B4DDB"
font: Inter
source_of_truth: PRD.md
---

# Billora — Design System & UI Implementation Guide

> **Product:** Billora, not Subnex. **Demo business/customer:** Brightloop Software.  
> **Audience:** Abhishikth (frontend system, billing and customer flows), Abiya (admin, quotations and intelligence modules), Adithya (backend/API contracts).  
> **Purpose:** One decisive visual and interaction specification for React + TypeScript + Tailwind + reusable components, suitable for Codex and other coding assistants.  
> **Authority:** `PRD.md` decides *what* the system must do; this file decides *how the interface looks and behaves*. `ARCHITECTURE.md` (when present) decides technical contracts. Do not invent capabilities missing from the PRD.

## 0. Non-negotiable design principles

1. **Financial clarity first.** Every money figure has a label, currency, time range, and meaningful calculation basis. Bills, due dates, discounts and balances must be obvious without hover.
2. **Calm density, not clutter.** Keep operational tables compact and scannable, but leave enough spacing around high-stakes forms, summaries and confirmation dialogs.
3. **One unmistakable action per view.** Use violet for the primary CTA; secondary actions are neutral. Destructive actions are distinct and require confirmation.
4. **Status is always legible.** Status uses a word + icon/color, never color alone. `Overdue` is visually distinct from `Unpaid`.
5. **Real workflows, real states.** Every button must work, be correctly disabled, or be explicitly marked as demo preview/unavailable. No decorative fake functionality.
6. **Low visual noise.** Use fine borders, subtle surfaces and tight typography. Avoid gratuitous gradients, heavy shadows, glass effects, endless colored tiles and excessive icons.
7. **Role-aware and responsive.** Admin/staff/customer may share components, but must not see unauthorized navigation/actions. Function at 360px through desktop.
8. **Accessible by default.** Keyboard-visible focus, labels/errors, readable contrast and accessible data tables are mandatory.
9. **Fast to build consistently.** Prefer reusable component patterns from the beginning. Do not create slightly different versions of buttons, filters, status tags or empty states in each feature.
10. **Own the brand.** Inspiration is not duplication: no Stripe/Linear wordmarks, proprietary fonts, exact imagery, or copied UI artwork. Billora uses its own tokens and content.

## 1. Visual inspiration and translation

**Stripe contribution (from the team's supplied Stripe `DESIGN.md`):** White / pale cool surfaces, rich navy ink, one violet primary action color, restrained cards and borders, lightly weighted editorial headlines, clear pricing and invoice presentation, modest control radius, generous spacing in important summaries. The source includes a proprietary `sohne-var` font; **Billora must use the open-source Inter variable font instead**. The source's large multi-stop aurora gradient is a marketing motif, not an instruction to decorate every dashboard panel.

**Linear contribution (from public product-design material):** Quiet, slightly receded sidebar; consistent page headers and view controls; dense but readable tables; powerful search and filters; subtle separators; small, consistent iconography; predictable list-to-detail workflow; keyboard-friendly operations. Linear's March 2026 refresh specifically emphasizes reduced noise and focusing visual weight on the working content.

**Billora interpretation:**
- **Main app:** Primarily light financial UI, softly tinted gray-blue canvas, white data surfaces, narrow subtle separators.
- **Navigation:** Compact, muted sidebar and top contextual toolbar; content gets the strongest contrast.
- **Accent:** Original Billora violet `#5B4DDB`. Reserve accent for meaningful interactivity, not every number.
- **Marketing/auth:** Small, restrained abstract lavender-to-peach glow permitted in a sign-in/hero illustration only; no brand-copy aurora ribbons.
- **Density:** More compact than a marketing website; more breathing room than a spreadsheet.
- **Identity:** Billora wordmark in Inter SemiBold plus a simple original abstract `B` / billing-cycle monogram if time allows; text-only wordmark is acceptable.

### 1.1 Mood words

**Trustworthy · Precise · Fast · Quiet · Intelligent · Enterprise-ready · Human-readable**

### 1.2 Avoid these anti-patterns

- No pill-shaped primary buttons, extreme 24px+ card radii or glassmorphism.
- No huge purple page backgrounds, multi-gradient dashboards, neon lines, bright glows behind charts, or shadow-heavy tiles.
- No 16px body text everywhere in tables; dense operations need deliberate 13–14px typography.
- No color-coded numbers without explicit legends or labels.
- No fake charts / meaningless KPI changes / placeholder financial figures passed off as live data.
- No mandatory dark theme implementation during P0 if it risks delaying real workflows.

---

## 2. Design tokens — single source of truth

Tokens below are **Billora originals / adaptations**, not Stripe's official design-system values. Implement them centrally as CSS variables; avoid hard-coded colors inside feature components.

### 2.1 Light theme colors

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#F7F9FC` | App canvas and content background |
| `--surface` | `#FFFFFF` | Tables, cards, dialogs, form panels |
| `--surface-subtle` | `#F1F5FB` | Sidebar, inset panels, selected gray controls |
| `--surface-hover` | `#EDF2F9` | Neutral hover and row hover |
| `--border` | `#E4EAF2` | Hairline dividers, fields, cards |
| `--border-strong` | `#CBD5E3` | Form focus-adjacent and emphasized separators |
| `--text` | `#17233C` | Headlines, body, financial figures |
| `--text-muted` | `#516078` | Secondary text, table headers, metadata |
| `--text-subtle` | `#64748B` | Less prominent supporting text (verify context contrast) |
| `--primary` | `#5B4DDB` | Primary buttons, active nav bars, links |
| `--primary-hover` | `#4C3FC4` | Primary hover |
| `--primary-soft` | `#EEEAFE` | Selected filters, subtle highlights |
| `--on-primary` | `#FFFFFF` | Primary button content |
| `--success` | `#167B68` | Paid, completed, active-positive states |
| `--success-soft` | `#E5F5EF` | Success badge fill |
| `--warning` | `#966300` | Pending, upcoming, draft caution |
| `--warning-soft` | `#FFF4D8` | Warning badge fill |
| `--danger` | `#A33D50` | Overdue, failed, destructive outcomes |
| `--danger-soft` | `#FDECEF` | Error badge fill |
| `--info` | `#2558B5` | Informational, confirmed, system events |
| `--info-soft` | `#EAF2FF` | Info badge fill |
| `--overlay` | `rgba(14,23,43,.48)` | Modal scrim |

**Accessibility constraint:** Meaningful text and interactive controls must meet WCAG 2.2 AA contrast as used; do not assume the combination is accessible solely because tokens are named. Use `--text` or `--text-muted` for small text rather than low-opacity decorative gray. Text on `--primary` is white.

### 2.2 Optional dark theme tokens (P2 polish only)

Implement dark mode only after main workflows are fully working. Avoid switching only half the app.

| Token | Suggested dark value |
|---|---|
| `--bg` | `#0E1524` |
| `--surface` | `#152033` |
| `--surface-subtle` | `#111B2B` |
| `--surface-hover` | `#202D42` |
| `--border` | `#2A374C` |
| `--text` | `#EDF2FB` |
| `--text-muted` | `#B6C2D5` |
| `--primary` | `#AA9BFF` |

Status fills and contrasts need a separate dark-mode QA pass, not blind reuse of light fills.

### 2.3 Typography

**Font:** `Inter Variable`, installed via npm or a permitted hosted font; fallbacks `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`. Do not attempt to bundle or download the Stripe proprietary font `sohne-var`.

| Name | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 40 / 48 desktop; 30 / 38 mobile | 400 | Rare landing/auth headline |
| `page-title` | 27 / 34 | 500 | Main screen title |
| `section-title` | 19 / 26 | 600 | Card/section heading |
| `card-title` | 15 / 22 | 600 | Card heading |
| `body` | 14 / 22 | 400 | Main app prose, forms |
| `body-strong` | 14 / 22 | 600 | Field/row labels |
| `body-small` | 13 / 19 | 400 | Table rows, metadata |
| `caption` | 12 / 17 | 500 | KPI descriptor, tooltip, timestamp |
| `kpi` | 29 / 36 | 600 | Important currency/count figures |
| `table-head` | 12 / 16 | 600 | Column headings, sentence case |
| `money` | inherit | 500–600 | Tabular numeric money amounts |

- Default app text: **14px**, not miniature 11px body copy.
- Use headings in **sentence case**, not ALL CAPS.
- Allow light/medium headings in open spaces and semibold headings in dense cards.
- Use `font-variant-numeric: tabular-nums` for money, quantities, dates, invoice IDs and KPI comparisons.
- Normal tracking for body; slightly negative tracking (`-0.02em`) only for display/page headers.
- Abbreviations (MRR, ARR) may remain uppercase as established domain terms.

### 2.4 Spacing and sizing

**Base grid: 4px.** Prefer increments of 4, not arbitrary gaps.

| Token | Size | Common use |
|---|---:|---|
| `1` | 4px | Icon/label microgap |
| `2` | 8px | Inline gap, list row details |
| `3` | 12px | Dense card internals |
| `4` | 16px | Form field gap, default card padding minimum |
| `5` | 20px | Table toolbar and section spacing |
| `6` | 24px | Typical dashboard card padding |
| `8` | 32px | Main section spacing and page padding |
| `10` | 40px | Auth/hero separation |
| `12` | 48px | Large section whitespace |

| UI measurement | Desktop | Mobile |
|---|---|---|
| Sidebar width | 238px expanded / 64px collapsed | Sheet/drawer, not persistent |
| App top bar | 60px | 56px |
| Page gutter | 28–32px | 16px |
| Content maximum | 1440px for dashboards | Fluid |
| Reading/form maximum | 720–840px | Fluid |
| Minimum control height | 40px | 44px |
| Data table row | 44–48px | Responsive cards or scrollable table |
| Modal width | 480px normal; 720px complex | Near full width, safe margins |

### 2.5 Shape and elevation

| Token | Value | Use |
|---|---|---|
| `--radius-control` | 6px | Buttons, inputs, search, badges |
| `--radius-card` | 10px | Dashboard cards, data panels |
| `--radius-dialog` | 12px | Popovers, drawers and modal panels |
| `--radius-round` | 9999px | Avatar and small dot only |
| `--shadow-popover` | `0 8px 26px rgba(23,35,60,.10)` | Popovers and menus |
| `--shadow-dialog` | `0 18px 52px rgba(23,35,60,.16)` | Modal overlays |

Use subtle 1px borders for regular cards; do **not** add visible shadows to every card. Avoid full-pill CTAs even though the user-uploaded source supports round avatars.

### 2.6 Motion

- Hover/focus: `120–160ms ease-out` for color or background.
- Drawer/modal: `160–220ms ease-out` and no gratuitous bounce.
- Chart transitions: `200–300ms`, disable for reduced motion.
- Skeletons: gentle, low-contrast; respect `prefers-reduced-motion`.
- Never animate numeric financial values continuously for aesthetic effect.

---

## 3. Starter CSS tokens (implement once)

Place in the global stylesheet owned by Abhishikth. Integrate with existing Tailwind/shadcn tokens if present; **do not create two competing token systems**.

```css
:root {
  --bg: #F7F9FC;
  --surface: #FFFFFF;
  --surface-subtle: #F1F5FB;
  --surface-hover: #EDF2F9;
  --border: #E4EAF2;
  --border-strong: #CBD5E3;
  --text: #17233C;
  --text-muted: #516078;
  --text-subtle: #64748B;
  --primary: #5B4DDB;
  --primary-hover: #4C3FC4;
  --primary-soft: #EEEAFE;
  --on-primary: #FFFFFF;
  --success: #167B68;
  --success-soft: #E5F5EF;
  --warning: #966300;
  --warning-soft: #FFF4D8;
  --danger: #A33D50;
  --danger-soft: #FDECEF;
  --info: #2558B5;
  --info-soft: #EAF2FF;
  --radius-control: 6px;
  --radius-card: 10px;
  --radius-dialog: 12px;
}

html { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
body { color: var(--text); background: var(--bg); font-size: 14px; }
.tabular-nums { font-variant-numeric: tabular-nums; }
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

**Suggested stack:** Tailwind CSS + shadcn/ui (as code you own, not a rigid runtime dependency) + Lucide icons + Recharts. Use existing versions already installed in the project; do not migrate the entire app just for this guide.

---

## 4. App shell & navigation

### 4.1 Desktop structure

```text
┌────────────────┬──────────────────────────────────────────────────────────┐
│ Billora        │ [Breadcrumb / Screen title]       Search   Bell  Avatar │
│                ├──────────────────────────────────────────────────────────┤
│ Overview       │ Page title                          [Primary action]    │
│ Subscriptions  │ Useful summary / description                             │
│ Invoices       │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│ Payments       │ │ KPI card │ │ KPI card │ │ KPI card │ │ KPI card    │ │
│ Customers      │ └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │
│                │ ┌───────────────────────────┐ ┌──────────────────────┐ │
│ Catalog        │ │ Main chart / table        │ │ Alerts / activity    │ │
│ - Products     │ │                           │ │                      │ │
│ - Plans        │ └───────────────────────────┘ └──────────────────────┘ │
│ - Discounts    │                                                          │
│ Automation     │ Filters   Search    Date range      Export               │
│ Reports        │ ┌──────────────────────────────────────────────────────┐ │
│ Settings       │ │ Dense, keyboard-friendly record list                │ │
└────────────────┴──────────────────────────────────────────────────────────┘
```

- Sidebar **muted** (`--surface-subtle`), 238px wide, `--border` separator; icons 17–18px, labels 13–14px.
- Sidebar sections: workspace/brand at top; main nav; collapsible catalog/automation groups; bottom settings/account.
- Active item: pale violet background, dark ink label, violet 2px inset left rail or violet icon; not a huge solid violet block.
- Header stays consistent: breadcrumbs left, global search (optional implementation), notifications icon, avatar / current role right.
- Page title section: title + one-sentence descriptor; primary CTA right on desktop, full-width / right-aligned below title on mobile.
- Width: cap broad data pages around 1440px; forms use narrower reading width.
- Do not show duplicate page titles in both header and body at equal emphasis.

### 4.2 Role-aware navigation (match PRD)

**Admin:** Overview; Customers; Products & variants; Plans; Taxes; Discounts; Quotation templates; Quotations; Subscriptions; Invoices; Payments; Reports; Automation Center; Revenue Radar; Timeline; Notifications; Staff; Settings. P2/P3 pages only when implemented.

**Staff:** Overview; Customers; Quotations; Subscriptions; Invoices; Payments; Reports; authorized Timeline and Notifications. Hide admin-only configuration links, but **also enforce permissions on the backend**.

**Customer:** Home; My subscriptions; My invoices; Notifications (P1); Account. Plan switching (P2) and Organization (P3) only when implemented and authorized.

**Enterprise parent (P3):** Customer portal + authorized child accounts / consolidated billing; no blanket administrator capabilities.

### 4.3 Mobile behavior

- At `< 1024px`, sidebar may collapse to icons; at `< 768px`, it becomes a menu drawer opened from header.
- One column for dashboards at `< 640px`; two columns on tablet where feasible.
- Toolbars wrap: title then primary action; filters become horizontal scrolling chips or a filter sheet.
- Financial tables: preserve essential columns in a scrollable region with clear overflow cue, **or** render readable list cards. Never shrink fonts below readable sizes to fit everything.
- Dialogs become almost full-screen sheets on narrow devices; keep confirm buttons visible.
- No mobile horizontal scrolling of the entire page.

### 4.4 Search and navigation conventions

- Search input `Search subscriptions, customers, invoices…` with magnifier and accessible label; keyboard shortcut `/` only when not typing in input.
- List views use filters for status, date, plan and customer where relevant. Show active filter chips and a `Clear filters` action.
- Put view filters in the URL query string when simple to implement, so links and browser navigation remain consistent.
- List row click navigates to details; explicit row action menu is separate to prevent accidental destructive operations.
- Breadcrumbs on detail routes: `Subscriptions / SUB-00024`.
- Never hide basic actions only in right-click menus.

---

## 5. Core reusable component rules

### 5.1 Buttons and links

| Variant | Appearance | Usage |
|---|---|---|
| Primary | `--primary` fill, white text, 6px radius | Create subscription, Save, Run billing (with confirmation) |
| Secondary | White with 1px border, ink text | Export, Cancel, Back, Preview |
| Tertiary/ghost | Transparent, neutral hover | Table row actions, secondary navigation |
| Destructive | `--danger` text or filled on final confirm | Cancel invoice, close subscription, delete rule |
| Link | Violet text, underline on hover/focus | Deep links, related invoice, customer name |

Default button height **40px desktop / 44px mobile**, 14px medium label, horizontal padding 14–16px. Include icon only when it communicates meaning; loading shows spinner with accessible label; disabling must have an understandable reason where relevant.

### 5.2 Inputs and forms

- Explicit visible label above input; placeholder is a hint, not a label.
- Field height 40/44px, 1px `--border`, control radius; focused input shows violet ring + border.
- Helper text beneath field, error text below helper only where required. Errors need text and appropriate ARIA relationships.
- Monetary input aligns value to the right; currency shown as fixed prefix or adjacent selector. Don't silently mix currencies.
- Date inputs use a date picker plus accessible typed date where feasible; display dates in local format, store ISO dates per API contract.
- Required marker next to label, full validation on server; on submit, focus first invalid field and display top-level error summary when many failures occur.
- Long flows use grouped sections with informative titles; sticky action footer for editing on wide views if helpful.
- Password registration shows requirements: >8 chars, uppercase, lowercase, special; confirm password if requested. Never show password in logs.
- Sensitive actions indicate permission restrictions without relying on disabled controls alone.

### 5.3 Cards, KPI tiles and metrics

- Cards use white surface, hairline border, 10px radius, 20–24px interior padding.
- Standard KPI: muted 12–13px label, large 28–30px figure in tabular numerals, optional small trend line/badge.
- Keep one clear metric per tile; include time basis: `Collected this month`, not just `Revenue`.
- P0 top summary: Active subscriptions; Collected revenue; Outstanding balance; Overdue invoices.
- Trends must be based on real comparisons. If no baseline exists, show `—` or `No comparison available`, not fabricated `+12.4%`.
- Figures are never clickable without discoverable affordance: use underlined `View records` or make card a proper link with focus.

### 5.4 Data tables

Use table/list patterns for Products, Plans, Quotations, Subscriptions, Invoices, Payments, Customers, Alerts and Notification History.

**Default: ordered header + search + filter controls + table + pagination.**
- Headers 12px semibold, muted; rows 13–14px, 44–48px height, subtle hover; bottom hairline separators.
- Numeric fields right-aligned; amounts tabular; dates in concise consistent format; statuses appear as text badges.
- Name/identifier column remains primary left anchor; use identifier as secondary monospaced-like tabular label, not a full monospace font for the whole UI.
- Sorting arrows only on sortable fields, with ARIA sort attributes.
- Page size 20/25/50; use backend pagination for thousands of records, not rendering 3,000 rows at once.
- Empty query `No invoices match these filters` + `Clear filters`; empty dataset `No invoices yet` + contextual next action.
- Loading: 4–6 skeleton rows with matching column geometry; failure: retry region with problem context.
- Long text truncates visually and can be inspected via row detail / tooltip; avoid wrapping whole rows into massive heights.

### 5.5 Status badges — canonical mapping

| Domain | Status | Semantic style | Label example |
|---|---|---|---|
| Subscription | `DRAFT` | neutral | Draft |
| Subscription | `QUOTATION` | info | Quotation |
| Subscription | `CONFIRMED` | info | Confirmed |
| Subscription | `ACTIVE` | success | Active |
| Subscription | `PAUSED` | warning | Paused |
| Subscription | `CLOSED` | neutral | Closed |
| Invoice | `DRAFT` | neutral | Draft |
| Invoice | `CONFIRMED` | info/warning | Awaiting payment |
| Invoice | `PAID` | success | Paid |
| Invoice | `CANCELLED` | neutral/danger text | Cancelled |
| Invoice computed | `OVERDUE` | danger | Overdue |
| Notification | `QUEUED` | info | Queued |
| Notification | `SENT` | success | Sent |
| Notification | `FAILED` | danger | Failed |
| Notification | `PREVIEW_ONLY` | neutral | Preview only |
| Import | `VALIDATED` | info | Validated |
| Import | `IMPORTED` | success | Imported |

`OVERDUE` is generally **derived from payment state and due date**, not automatically a persisted invoice state. Never confuse `Confirmed` with fully paid. When the backend uses different enumerations, use one centralized mapping rather than scattered string comparisons.

### 5.6 Dialogs, drawers, toasts

- Modal for high-stakes confirmation: execute billing, cancel invoice, close subscription, destructive edit.
- Side panel for quick inspection of an invoice, customer, or billing job, without losing the list context.
- Dialog anatomy: title, one-sentence consequence, concrete affected record and summary, action row (`Cancel` first, destructive/confirm last).
- Toast: short confirmation for reversible events; no toast as sole communication of form-level error.
- Use in-page banner for persistent warnings (failed billing, notification integration unavailable).
- Focus is trapped in modal; `Esc` closes only safe dismissable dialogs; focus returns to trigger on close.

### 5.7 Icons and imagery

- Use **Lucide** icons with consistent stroke widths (~1.75–2), primarily 16–18px in navigation and tables, 20px in feature headings.
- Dashboard icons should be sparse; information hierarchy is led by labels, not decoration.
- Avatar can show initials; no need for profile image uploads in P0.
- No stock photography in operational app. If an auth illustration is needed, create an original abstract billing-cycle motif using CSS/simple SVG.

---

## 6. Data visualization language

Use Recharts or existing lightweight charts. All data must be fetched/derived from the app backend, never hardcoded as operational facts.

| Visualization | Preferred form | Notes |
|---|---|---|
| Revenue received over time | Line/area chart | Date-axis, currency tooltip, clear date filter |
| Active subscriptions by plan | Horizontal bar | Show explicit counts and sortable labels |
| Invoice status distribution | Bar/donut with adjacent legend | Avoid donut when values are too similar or small |
| Revenue forecast (P2) | Solid line actual + dashed forecast | Separate projected from realized values visibly |
| Time Machine (P1) | Timeline + grouped upcoming actions | Preview has explicit `Simulation` label |
| Leak Radar (P1) | Severity summary + filtered issues table | Actionable records, not an abstract risk score |
| Usage limits (P3) | Progress bar | Label `82 / 100 seats`, threshold text |

### 6.1 Chart series palette

- Series A / core revenue: `#5B4DDB` violet.
- Series B / collected: `#167B68` teal.
- Series C / outstanding: `#2558B5` blue.
- Series D / upcoming: `#B3781C` muted gold.
- Series E / overdue: `#A33D50` muted rose.
- Forecast: dashed violet line or pale violet band; **not** a deceptive solid historical line.

Keep axes/grid low contrast but readable. Use clear legends/labels/tooltips to preserve meaning without color. No 3D charts, gauge gimmicks, giant decorative waves or rainbow pies.

### 6.2 Data formatting rules

- UI uses `Intl.NumberFormat(locale, {style: "currency", currency})` with currency from record/config; don't hardcode rupee sign for all customers.
- Demo may seed `INR` and show `₹6,500.00` consistently; amount precision follows monetary rules in PRD.
- Date-only values: `31 Oct 2026` in UI; timestamps may show `31 Oct 2026, 2:30 PM` with explicit timezone where meaningful.
- Backend stores ISO-formatted dates/timestamps; frontend formatting does not change stored values.
- Avoid ambiguous labels: use `Paid revenue`, `Expected invoices`, `Outstanding`, `MRR (estimated)`, and define meaning in tooltips.
- For predicted figures, label `Estimate` or `Projected`, and make assumptions visible.

---

## 7. Screen-by-screen design specifications

Build in **P0 → P1 → P2 → P3** order from the PRD. These are UI contracts, not permission to substitute data placeholders for working services.

### 7.1 Admin / Staff: Overview dashboard (P0)

**Top:** `Overview` title; date filter; optional `Run billing` quick action for authorized admin.

**Row 1:** Four KPI cards: active subscriptions, collected revenue, outstanding invoice balance, overdue invoices.

**Row 2:** Main revenue chart (about 2/3 width), `Needs attention` panel (1/3). Attention cards link to overdue invoices / failed billing jobs.

**Row 3:** Recent subscriptions or invoices table + activity mini-feed (when P1 exists).

**Empty state:** Clear setup CTA (`Create your first product` / `Create subscription`) according to role; don't show empty charts with fake revenue.

### 7.2 Admin: Products & variants (P0; Abiya)

**List:** Search, product type, active filter, `Add product`. Columns: name, type, base sales price, cost price (admin), variants count, status, updated date.

**Create/edit:** Product name, type, notes, sales price and cost price. Variants shown in a nested table: attribute/option, price adjustment (e.g., `+₹560`), resolved price preview. Use two-column editor on desktop, stacked on mobile.

**Validation:** Required name, nonnegative prices, distinct variant combinations, clear server error when duplicate.

### 7.3 Admin: Plans (P0; Abiya)

List and creation page should emphasize **billing frequency** (Daily/Weekly/Monthly/Yearly), minimum quantity, availability dates, and toggles for auto-close, early close, pause and renewal policies. Show a clear `Billing summary` card alongside the form that updates from input, marked preview until saved. Plans with invalid date ranges cannot save.

### 7.4 Admin: Taxes & Discounts (P0; Abiya)

Keep Taxes and Discounts as distinct views or accessible tabs; do not mix two unrelated forms in a giant page.

**Taxes:** Rule list, rate, applicability and effective period; numeric percent input and scope selector.

**Discounts:** Type (fixed / percent), value, minimum amount or quantity, effective dates, usage cap and applicable products/subscriptions. Show a small example calculation for a sample quantity without claiming it overrides backend billing calculations. Prominently label admin-only editing.

### 7.5 Staff: Quotation templates and quotations (P0; Abiya)

- Templates list: name, plan, number of product lines, validity days; `Create template`.
- Quotation editor: customer, template selector, product line table, quantities, prices, taxes, quotation expiry and total preview.
- Promote `Draft → Quotation → Confirmed` as a clear status progression at top of detail view; buttons reflect allowed transitions.
- Use an editable grid for line items but keep server validation authoritative.

### 7.6 Admin/Staff: Subscriptions list and detail (P0; Abhishikth)

**List columns:** Subscription number, customer, plan, status, billing frequency, next billing date, recurring amount, actions. Filters for status, plan and renewal window.

**Detail header:** `SUB-00024` + status + customer; clear contextual actions (`Activate`, `Pause`, `Renew`, `Close`) **only when policy allows**.

**Detail sections:** Summary panel (dates, plan, payment terms), Product lines, Billing schedule, Related invoices, Activity (P1).

For irreversible actions, show an explicit confirmation and a description of invoice/renewal consequences. Never allow unsupported transition buttons just to decorate the interface.

### 7.7 Admin/Staff: Invoices list & detail (P0; Abhishikth)

**List:** Invoice ID, customer, related subscription(s), issued date, due date, total, paid amount, outstanding, status; search/status/date filters and `Print` where supported.

**Detail:** Printable structured invoice with Billora header, bill-to information, invoice ID/dates, itemized lines, subtotal, discount, tax, total, payments and remaining due. Add an explicit `Explain total` area later for P1.

**Actions:** `Confirm`, `Cancel`, `Send invoice`, `Print`, `Record payment` according to invoice state and permissions. Print view hides sidebar/top bar and interactive controls via CSS `@media print`.

**Consolidated invoices (P2):** Lines identify originating subscription; grouped by subscription with grouped subtotals. Keep one invoice number and one outstanding balance.

### 7.8 Admin/Staff: Payments (P0; Abhishikth)

Payment list with invoice link, amount, method, date, note and actor. Record-payment dialog shows **current invoice outstanding amount**, allows partial amount up to permitted remaining balance, and confirms updated balance on save. Never represent a partial payment as Paid.

### 7.9 Customer portal (P0; Abhishikth)

Visually related to admin UI but **less dense**, with fewer navigation items and more emphasis on next action.

**Home:** Welcome, active subscriptions, next renewal date, outstanding balance, recent invoices.

**My subscriptions:** Cards or simplified table with plan, renewal and status. Actions constrained by plan policy.

**My invoices:** Invoice list with `View` and `Print/download` when available; P1 `Explain my bill` panel expands into itemized math and payment status.

**Account:** Profile, secure password settings and notification preferences (P1).

**Privacy:** The UI must never suggest that the customer can explore other customers by manipulating IDs or filters; backend enforces ownership.

### 7.10 Automation Center / Subscription Time Machine (P1; Abhishikth)

Make this the demo showpiece, but maintain operational restraint.

```text
Billing Time Machine                 [PREVIEW MODE]
Choose reference date   [31 Oct 2026]  Horizon [7d | 30d | 90d]
[Preview changes]

┌──────────────────┬──────────────────┬─────────────────┐
│ Due invoices     │ Renewals         │ Expirations     │
└──────────────────┴──────────────────┴─────────────────┘

Upcoming billing events             [Filter by type]
Timeline / Table: Date | Subscription | Event | Expected amount

[View billing details]         [Execute eligible billing…]
```

- **Preview mode** gets a neutral/blue informational banner, not a destructive-sounding button. State explicitly `No records will be changed`.
- The action that can mutate billing uses violet primary only after admin enters the dedicated execute/confirm flow.
- Results panel shows `Created`, `Already processed`, `Skipped`, `Failed` as named counts with drill-down; never silently hide errors.
- Do not allow production ledger advancement to arbitrary future dates; demo date simulation is read-only or isolated.

### 7.11 Revenue Leak Radar (P1; Abiya)

**Header:** `Revenue Leak Radar`, explanatory subtitle, `Refresh checks` action.

**Summary:** A few compact KPIs: missed billing events, overdue invoice count, estimated value at risk; avoid unexplained scores.

**Issues table:** Severity, reason, customer, linked subscription/invoice, potential impact, recommended action, detected date.

Use severity pills but also textual labels (`High`, `Medium`). Row opens affected record. Resolved findings should disappear or show `Resolved` based on backend logic; do not fabricate dismissals locally.

### 7.12 Subscription Activity Timeline (P1; Abiya)

Vertical timeline embedded in subscription detail or independent view. Each row: event icon, human-readable event, actor/system label, precise timestamp, link to record. Example: `Invoice INV-101 generated automatically · System · 31 Oct, 9:30 AM`.

Newest first; filter by event category; no timeline events for actions that did not happen. Sensitive metadata is not exposed to customer view.

### 7.13 Notification Center & renewal reminders (P1; Abiya)

List reminders by type, customer, channel, scheduled date, send status and error reason (when failed). Clear channel indicator (Email / WhatsApp / In-app). Mark email and WhatsApp `Preview only` when not configured; no fake green `Sent` states. Customer setting screen includes allowed channel opt-in toggles and upcoming reminders.

### 7.14 Revenue Forecast Simulator (P2; Abhishikth)

Three controls: time horizon (next 3/6/12 months), optional assumption for new customers/price changes, and `Recalculate`. Show chart with actual revenue history solid and future projection dashed, separated by a vertical `Today` reference. KPI `Projected billings` must not be mislabeled as cash already received. A sidebar/panel explains estimation assumptions and exclusions.

### 7.15 Smart Plan Switching (P2; Abhishikth)

Plan comparison cards side-by-side; current plan marked `Your plan`; preview next billing amount and effective date. Select new plan/seat quantity → `Review change` dialog → confirmation. Prefer next-cycle changes to mid-cycle proration unless PRD is explicitly extended. Do not show `Instant upgrade` if service only schedules it.

### 7.16 Smart Spreadsheet Migration (P2; Abiya)

Use a four-stage wizard:

1. **Upload CSV** (file type/size constraints + downloadable sample format).
2. **Map columns** (source field → required destination field, inline preview).
3. **Validate** (valid/invalid rows, per-row errors, duplicate detection).
4. **Import** (preview count, confirm, exact imported/skipped/failed summary).

No silent dropping of rows. All validation must happen server-side before final import; preview is not a successful import.

### 7.17 Consolidated invoicing, organizations, usage (P2/P3)

- **Consolidated invoice:** group invoice lines under subscription headings; preserve each source link and show a single final amount.
- **Enterprise account:** parent view contains child accounts and authorized aggregates; indicate selected account context to prevent confusion.
- **Usage limits:** simple seat usage bar with `used / limit`, percent and thresholds; actual assignments/events back the numbers. Clear upgrade/change-plan CTA only if flow exists.

---

## 8. Interaction conventions and feedback states

### 8.1 Standard states for every data-driven view

Implement all six; don't skip failures because the happy path looks polished.

| State | Visual pattern |
|---|---|
| Loading | Skeleton matching final content geometry; preserve overall layout |
| Empty | Plain icon/illustration, factual explanation, primary next step (if authorized) |
| Error | Short reason + retry, technical detail only where appropriate |
| Success | Toast + updated local/server data, relevant new record in list |
| Permission denied | Clear no-access message; no unauthorized actions |
| Network disconnected | Non-destructive banner; never claim write saved until confirmed |

### 8.2 Optimistic vs confirmed updates

- Safe preference toggles may update optimistically with rollback on failure.
- **Payments, invoices, subscription state, billing jobs, discounts and imports must wait for server confirmation** before displaying completion.
- Buttons with pending network actions show loading and prevent duplicate submission.
- On conflicts (stale record), refresh and explain what changed.

### 8.3 Destructive / high-risk operations

- Cancel/close/execute-billing actions always show confirm dialog with record ID and consequence.
- For an already-processed billing run, render `Already processed` rather than treating idempotent skip as an error.
- Cancellation and deletion must never appear as the primary call to action.

### 8.4 Empty state copy examples

- `No subscriptions yet` → `Create a subscription to start recurring billing.`
- `No invoices match these filters` → `Try changing the status or date range.`
- `No revenue risks detected` → `We haven't found overdue or missed-billing events for this filter.`
- `No notifications sent` → `Reminders will appear here when they are generated.`
- `No forecast available` → `Add active subscriptions to calculate expected billing.`

No fake placeholder records in production lists. Demo seed data must be clearly intentional and stored in the backend.

---

## 9. Accessibility, performance and device requirements

### 9.1 Accessibility: WCAG 2.2 AA target

- Keyboard use: Tab/Shift+Tab focus order, Enter/Space activation, Escape where expected, no keyboard traps.
- Visible focus ring on buttons/links/inputs, not outline removed without replacement.
- Proper label/description/error associations; `aria-invalid` on invalid form fields.
- Status carries text; meaningful icons have labels; decorative icons hidden from assistive tech.
- Table header cells, sort indicators, pagination and chart summaries are accessible.
- Charts have textual summaries or small supporting data tables for essential financial insights.
- User preference `prefers-reduced-motion` disables non-essential movement.
- Comfortable touch targets at mobile sizes and no critical action available only on hover.
- Validate light-theme contrast for secondary text, badges, disabled controls, and chart labels before release.

### 9.2 Performance and responsiveness

The problem statement requires screens to respond in **under two seconds with thousands of subscriptions**. UI choices must support that goal:

- Server-side filtering, sorting and pagination for large lists.
- Render only current page; don't load full records to compute table counts if the API can aggregate.
- Debounce text search around 250–350ms; abort or ignore stale responses.
- Skeletons for perceived speed, but measure actual API/page response time separately.
- Lazy-load heavy chart/wizard routes when practical.
- Avoid chart rerenders on unrelated input events; memoize large transformed datasets as needed.
- Don't load massive image assets in an operational dashboard.
- Test at 360, 390, 768, 1024, 1280 and 1440px widths.

---

## 10. Implementation conventions for React / Tailwind / Codex

### 10.1 Suggested UI file layout and ownership

Use the actual repository layout if it already exists; avoid renaming colleagues' files only to match this example.

```text
frontend/src/
  app/                      # Abhishikth — router, page shell, providers
  styles/                   # Abhishikth — tokens and global styles
  components/ui/            # Abhishikth — shared buttons, inputs, dialogs, badges
  components/data/          # Abhishikth — table, filters, KPI, chart wrappers
  features/auth/            # Abhishikth
  features/customer/        # Abhishikth
  features/subscriptions/   # Abhishikth
  features/billing/         # Abhishikth
  features/dashboard/       # Abhishikth
  features/forecast/        # Abhishikth
  features/admin/           # Abiya — products, plans, taxes, discounts
  features/quotations/      # Abiya
  features/revenue-radar/   # Abiya
  features/activity/        # Abiya
  features/notifications/   # Abiya
  features/import/          # Abiya
```

**Shared-edit rule:** Abhishikth owns the shared shell, tokens, `components/ui`, central router and dependencies. Abiya builds screens inside her directories using those exports. Adithya owns backend APIs and models. Agree on contract changes before editing shared types/config files. Everyone commits their own code to `main` regularly per event rules.

### 10.2 Component interface suggestions

```ts
// Conceptual types; adapt to actual API contract.
type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";
type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
};
type MoneyProps = { amountMinor: number; currency: string; locale?: string };
type EmptyStateProps = { title: string; description: string; action?: React.ReactNode };
type DataTableState = "loading" | "ready" | "empty" | "error";
```

- Create a shared `PageHeader`, `StatusBadge`, `Money`, `MetricCard`, `DataTable`, `FilterBar`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `DateRangeFilter` and `LoadingSkeleton`.
- Use a single date/money formatter utility. Don't implement custom currency strings in every feature.
- Use a single roles/permissions helper based on authenticated session and server-returned capability, not raw email-name checks.
- Centralize status-to-tone mapping and use it for admin, staff and customer views.
- Never redefine `--primary`, fonts or buttons inside an individual feature stylesheet.
- Use semantic HTML and prefer shared accessible components rather than hand-rolled popovers.

### 10.3 Suggested component acceptance standard

A finished screen must:

1. Match tokens and shell in this design system.
2. Use actual typed API data or clearly labeled temporary local mock data during development.
3. Handle loading, success, empty and error states.
4. Show authorization-correct actions and server-confirmed changes.
5. Work on mobile and desktop without layout overflow.
6. Be keyboard-operable and include explicit field validation.
7. Have meaningful navigation/back links and no dead buttons.
8. Preserve financial labels and correct number/date formatting.

### 10.4 Prompt to give each coding assistant

> Read `PRD.md` and root `DESIGN.md` before coding. Implement Billora with the Stripe-inspired light financial clarity and Linear-inspired compact workflow patterns specified in `DESIGN.md`, using **Billora's own color tokens and Inter**. Build reusable accessible components, functional responsive pages, complete states and actual API integration. Follow assigned file ownership; do not change global styles, shared router, lockfiles, backend or contracts unless explicitly authorized. Do not copy Stripe/Linear branding or claim mock features are operational. Implement P0 before P1–P3.

---

## 11. Suggested visual QA checklist

- [ ] Billora wordmark appears consistently, with no “Subnex” leftovers.
- [ ] Sidebar is muted, active destination unmistakable; mobile drawer works.
- [ ] Every view has consistent title, header, spacing, surface, CTA hierarchy.
- [ ] Primary button is violet; other controls follow defined variants.
- [ ] All status labels use canonical mapping; overdue/paid/paused are visibly distinct.
- [ ] Money is aligned, formatted and scoped to a time period/currency.
- [ ] Tables are searchable/filterable/paginated as required; no heavy shadows.
- [ ] Forms show labels, validation and submit progress.
- [ ] Dashboard charts are legible and driven by real data.
- [ ] Invoices are screen-readable and printable, including discounts/taxes.
- [ ] Simulation UI clearly separates read-only preview from server execution.
- [ ] Revenue forecasts are unmistakably estimates, not realized cash.
- [ ] Email/WhatsApp test-mode status is honest and visible.
- [ ] 360px mobile, 768px tablet, 1280px desktop checks completed.
- [ ] Empty, loading, error, permission and success states exist.
- [ ] Keyboard focus, screen-reader labels and contrast tested.
- [ ] No unauthorized action becomes visible because only navigation was hidden.
- [ ] Every prominent CTA works or is explicitly disabled with explanation.

---

## 12. Sources and adaptation note

- **Primary supplied reference:** The team's uploaded Stripe `DESIGN.md` excerpt (color system, typographic restraint, white/soft surfaces, near-square controls and restrained elevation). This is inspiration for original Billora tokens, not a copy/paste specification.
- **Linear product UI reference:** https://linear.app/changelog/2026-03-12-ui-refresh and https://linear.app/now/behind-the-latest-design-refresh (focused content hierarchy, muted sidebar, consistent view controls, softer separators).
- **Product source:** `PRD.md` (Billora official and optional features, roles, priorities, demo journey, performance and business rules).
- **Original user challenge:** `Subscription_Management_System.pdf` (Brightloop scenario). The source PDF does not specify any Stripe/Linear UI styling; all choices here are team-authored design proposals.

**Priority during the hackathon:** When a design polish choice conflicts with functional completeness, correct pricing, role security or deadline, ship the working behavior first. The final UI should still feel like one coherent product, not three different dashboards stitched together.
