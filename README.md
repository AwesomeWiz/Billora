# Billora

**Intelligent Subscription, Billing & Revenue Automation Platform**

Built for the **Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026**.

Billora brings recurring-service operations into one workspace: product variants, subscription plans, quotations, subscriptions, invoices, payments and revenue visibility. It addresses fragmented spreadsheets, unclear balances and manual renewal tracking. **Brightloop Software** is the challenge's fictional business scenario; Billora is the product.

The repository contains a responsive React application and a growing FastAPI backend. **The complete quotation-to-payment workflow is not operational yet.** Catalog and authentication functionality can be demonstrated using persisted data; financial screens clearly expose missing services and keep unsupported mutations unavailable.

## Current implementation

Status below follows the checked-in routers, schemas and frontend integration at backend commit `8bddf62`, also merged into main by `29622b7`. A screen, database model or specification alone does not establish a working API.

| Area | Status | What is available / remaining |
| --- | --- | --- |
| Application foundation | Implemented frontend | Billora design tokens, shared controls, desktop/mobile navigation, role-protected routes and accessible loading/error/unavailable states |
| Authentication | Implemented API + frontend integration | CSRF bootstrap, CUSTOMER registration, cookie login, verified `/me` identity and logout; no public ADMIN/STAFF registration |
| Products & variants | Implemented API + frontend | CRUD, search/filter/pagination, nested variants and legacy compatibility; ADMIN writes, ADMIN/STAFF reads |
| Subscription plans | Implemented API + frontend | CRUD, interval/active filtering, pagination, pricing and policy fields; ADMIN writes, existing public catalog reads retained |
| Discounts | Implemented API + frontend | Fixed/percentage rules, scope/product references, validity, usage limits and filtering; STAFF read-only. Billing redemption is not implemented here |
| Taxes | Frontend-only; backend pending | ADMIN route and forms exist; `/api/taxes` is not mounted. STAFF editor access is blocked |
| Quotation templates / quotations | Frontend-only; backend pending | Integrated screens; persistence, acceptance and transaction lifecycle require backend services |
| Customer profile | Implemented backend; limited portal integration | CUSTOMER-only GET/PUT `/api/customers/me`; portal Account currently displays session details and does not expose profile editing |
| Operational customers / subscriptions | Frontend implemented; backend in progress | List/detail adapters and lifecycle UI exist; `/api/accounts`, subscription reads and transitions are absent |
| Invoices / payments | Frontend implemented; backend pending | Snapshot views, safeguards, history adapters and manual-payment preparation. Confirm/cancel/send and payment submission remain disabled; no real invoice/payment flow is claimed |
| Financial overview / reports | Frontend-only; backend pending | Distinct collected/invoiced/outstanding metrics and overdue report UI; report endpoints are absent and no aggregates are fabricated |
| CUSTOMER billing portal | Protected frontend; data unavailable | Home, subscription/invoice lists and detail routes, session account view; owned billing reads, summary, history and printing remain unavailable |
| Revenue Leak Radar | Frontend module; integration pending | Feature source/tests exist; no central route or backend alert service is mounted |
| Time Machine / Explain My Bill / forecast / plan switching | Planned | P1/P2 roadmap; not working automation, forecasts or payment services |

Historical phase notes describe the state when written. In particular, the earlier missing-`user.id` authentication blocker is fixed in the current backend. Consult current code and [admin integration notes](backend/ADMIN_API_INTEGRATION.md) before treating an old dependency note as current status.

## Tech stack and architecture

| Layer | Technology |
| --- | --- |
| Web application | React 19, TypeScript, Vite 7, React Router |
| UI | Tailwind CSS 4, shared CSS tokens, Lucide React, locally bundled Inter |
| API | FastAPI, Pydantic, Uvicorn |
| Persistence | SQLAlchemy 2 async sessions, aiosqlite, SQLite |
| Security | Argon2 password hashes, opaque cookie sessions, CSRF and Origin checks |
| Tests | Vitest, Testing Library, jsdom, pytest, pytest-asyncio, HTTPX |

```text
Browser: http://localhost:5173
  React Router → AuthProvider / protected AppShell → feature screens
    → shared typed /api client (cookies + mutation CSRF header)
      → Vite /api proxy → FastAPI on localhost:8000
        → Pydantic validation + role/ownership dependencies
          → SQLAlchemy async sessions → SQLite
```

The frontend's single [API client](frontend/src/lib/api/client.ts) uses `credentials: include`, cancellation, deadlines and normalized errors. There are no automatic write retries or auth secrets in localStorage. The server decides roles, persisted state and financial results. Financial adapters validate uncertain responses locally; they do not make unimplemented backend contracts real.

**Intended billing flow:** catalog and plan definitions → agreed quotation/line prices → subscription → invoice snapshots → recorded payments → server-derived reports. Only the catalog/plan/rule setup portion currently has the corresponding operational APIs. See the [architecture](docs/ARCHITECTURE.md) for planned service boundaries and transactional invariants.

## Install on Windows PowerShell

Prerequisites: Git, **Node.js 22.12+** (or Node 24) with npm, and Python. Python **3.13** was used for the recorded backend validation. Backend dependencies are currently unpinned.

Clone once, or use your existing checkout:

```powershell
git clone https://github.com/AwesomeWiz/Billora.git
Set-Location Billora
```

Install the frontend from its own package directory; there is no root npm application:

```powershell
Set-Location frontend
npm.cmd ci
Set-Location ..
```

Create the backend virtual environment and install dependencies:

```powershell
Set-Location backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If activation is blocked by PowerShell policy, activation is optional:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Run all backend commands below from `backend/`. Configuration reads environment variables and an optional local `.env` via Pydantic settings. Defaults are API prefix `/api`, environment `development`, and `SQLITE_URL=sqlite+aiosqlite:///./billora.db`. A relative database path is relative to the backend process's working directory. No frontend environment secrets are required.

### Database initialization

Uvicorn startup registers the current models, creates missing tables and runs an additive SQLite catalog migration automatically. No seed command, administrator account or billing records are automatically created. For explicit initialization before provisioning:

```powershell
.\.venv\Scripts\python.exe -c "import asyncio; from app.main import on_startup; from app.core.db import engine; asyncio.run(on_startup()); asyncio.run(engine.dispose())"
```

Existing catalog records are retained. Legacy variant names/prices remain in their original columns; new attribute fields use compatible mappings. Deleted variants are retained as historical tombstones. Legacy catalog timestamps are backfilled with migration time because original creation times were not recorded.

Back up an existing SQLite database using SQLite's backup facility, or stop all database users before copying its files. Do not delete `billora.db`, discard WAL files or recreate tables to solve a migration issue. Alembic is installed, but there is no checked-in general-purpose Alembic migration workflow to run. Details: [schema compatibility and validation](backend/ADMIN_API_INTEGRATION.md).

## Run locally

Use two terminals from the repository root.

**Backend:**

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host localhost --port 8000 --reload
```

**Frontend:**

```powershell
Set-Location frontend
npm.cmd run dev
```

| Service | URL |
| --- | --- |
| Application | http://localhost:5173 |
| API health | http://localhost:8000/api/health |
| Swagger UI | http://localhost:8000/api/docs |
| OpenAPI JSON | http://localhost:8000/api/openapi.json |
| ReDoc | http://localhost:8000/api/redoc |

Open the browser at **`http://localhost:5173`**, even if Vite prints a `127.0.0.1` URL. The backend's current trusted Origin is exactly `http://localhost:5173`; `127.0.0.1:5173` and other ports are not equivalent for mutation authorization. Vite requires port 5173 and proxies `/api` to `http://localhost:8000` while preserving Origin.

## Authentication and roles

1. The anonymous frontend probes `/api/auth/me`; a 401 triggers GET `/api/auth/csrf`.
2. Register/login send email/password with cookies and `X-CSRF-Token`. Registration creates a CUSTOMER account and user; it does not create a signed-in session.
3. Login sets `session_token`; the frontend then verifies `/me`, including the real User.id, role, account_id and CSRF token, before granting protected access.
4. ADMIN/STAFF land in `/app/overview`; CUSTOMER lands in `/portal/home`. Logout revokes the session and clears cookies.

| Role | Current access |
| --- | --- |
| ADMIN | Operational application; catalog/plan/discount writes; Taxes frontend |
| STAFF | Operational application and internal catalog/discount reads; catalog/plan/discount writes rejected by backend; Taxes editor route denied |
| CUSTOMER | Own portal and own profile API; internal discounts and cost-bearing product/variant APIs denied; billing ownership APIs still pending |

Plans retain their existing public catalog reads. UI visibility is not authorization: some catalog forms still display STAFF controls that the backend correctly rejects. All assigned admin mutations require ADMIN, valid CSRF and trusted Origin. Public registration cannot select or elevate a role.

### Provision a local development administrator

There is no staff-management API or default admin password. Use an operator-controlled local shell against **your own development database**, after initialization. This creates a new account and hashed password, refuses an existing email and does not promote another user. Run from `backend/`; credentials are prompted and are not embedded in a file or shell history:

```powershell
.\.venv\Scripts\python.exe -c @'
import asyncio
from getpass import getpass
from sqlalchemy import select
from app.main import app  # registers models and relationships
from app.core.db import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models.account import Account, Role
from app.models.user import User
from app.schemas.auth import RegisterIn

async def provision():
    email = input("New local admin email: ").strip().lower()
    password = getpass("New password: ")
    if password != getpass("Confirm password: "):
        raise SystemExit("Passwords differ; nothing created.")
    payload = RegisterIn(email=email, password=password)
    try:
        async with AsyncSessionLocal() as db:
            async with db.begin():
                if await db.scalar(select(Account.id).where(Account.email == str(payload.email))):
                    raise SystemExit("Email already exists; no role changes made.")
                account = Account(email=str(payload.email), role=Role.ADMIN)
                db.add(account)
                await db.flush()
                db.add(User(account_id=account.id, hashed_password=hash_password(payload.password)))
        print("Local administrator created. Sign in through the application.")
    finally:
        await engine.dispose()

asyncio.run(provision())
'@
```

Use a unique password with at least nine characters, uppercase, lowercase and a supported special character. This is local provisioning guidance, not a remotely exposed endpoint or production identity-management solution.

## API reference

All paths below include `/api`. Runtime Swagger/OpenAPI is the authoritative reference for exact DTOs.

| Implemented endpoint | Methods | Access / purpose |
| --- | --- | --- |
| `/health` | GET | Public health response |
| `/auth/csrf` | GET | Anonymous CSRF cookie/token bootstrap |
| `/auth/register`, `/auth/login`, `/auth/logout` | POST | Cookie-based auth; CSRF + Origin required |
| `/auth/me` | GET | Authenticated session identity |
| `/customers/me` | GET, PUT | CUSTOMER's own profile; PUT requires CSRF + Origin |
| `/products` | GET, POST | Paginated internal catalog; ADMIN create |
| `/products/{product_id}` | GET, PATCH | ADMIN/STAFF read; ADMIN update |
| `/products/{product_id}/variants` | GET, POST | Internal list; ADMIN create |
| `/products/{product_id}/variants/{variant_id}` | PATCH, DELETE | ADMIN update/tombstone; parent-product matching enforced |
| `/products/variants`, `/products/variants/{variant_id}` | POST / GET respectively | Legacy variant compatibility with current authorization |
| `/plans` | GET, POST | Public paginated catalog; ADMIN create |
| `/plans/{plan_id}` | GET, PATCH | Public read; ADMIN update |
| `/discounts` | GET, POST | ADMIN/STAFF list; ADMIN create |
| `/discounts/{discount_id}` | GET, PATCH | ADMIN/STAFF read; ADMIN update |

Canonical collection URLs have **no trailing slash** and return `items`, `total`, `page`, `page_size`, `has_next`. Defaults are page 1 / page_size 20, maximum page_size 100. Product filters: `search,type,active`; plan filters: `search,billing_interval,active`; discount filters: `search,kind,scope,active`. Legacy slash GET products/plans retain array responses and `skip/limit`; slash POST plans is also retained. Use the canonical paths in new clients.

| Pending API area | Documented/frontend dependency; **not mounted** |
| --- | --- |
| Taxes | `/api/taxes` and rule details/mutations |
| Quotations/templates | `/api/quotations`, `/api/quotation-templates` and transaction actions |
| Operational accounts | `/api/accounts`, `/api/accounts/{id}`; not interchangeable with `/customers/me` |
| Subscriptions | `/api/subscriptions`, detail, `/api/subscriptions/{id}/transition` |
| Invoices | `/api/invoices`, detail, confirm/cancel/send/print actions |
| Payments | POST `/api/payments`, GET `/api/invoices/{id}/payments`; no invented global payment listing |
| Reporting | `/api/reports/summary`, `/api/reports/overdue` |
| Radar | `/api/alerts/revenue-leaks` |
| Recovery / automation | No mounted password-recovery or billing-job API; final contracts require coordination |

## Testing and verification

From `backend/`, using its virtual environment:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Tests force an isolated temporary SQLite database before application import and guard its location before schema cleanup. Test users authenticate through the real ASGI app; test fixtures are not production seed data. If an existing pytest cache is inaccessible, run `python -m pytest -v -p no:cacheprovider` using the activated environment instead of changing cache permissions.

From `frontend/`:

```powershell
npm.cmd run typecheck
npm.cmd test -- --reporter=dot
npm.cmd run build
```

The latest recorded admin implementation validation passed **42 backend tests**, **464 frontend tests**, TypeScript checks and the production build. These are recorded results, not a fresh execution for this documentation-only change. Existing FastAPI/Pydantic deprecations and a Vite bundle-size advisory remain. Passing frontend fixtures do not prove absent billing APIs, ownership enforcement or email/payment delivery.

## Project structure

```text
Billora/
├── README.md
├── docs/                     # PRD, architecture, design and ownership agreements
├── frontend/
│   ├── package.json          # frontend commands and dependencies
│   ├── vite.config.ts        # port, /api proxy, Tailwind and Vitest
│   └── src/
│       ├── app/              # central router, navigation, AppShell, integration audit
│       ├── components/       # shared UI and metric components
│       ├── styles/           # design tokens and responsive/print styles
│       ├── lib/              # typed HTTP client and formatting
│       ├── features/         # auth, customer, billing, subscriptions, dashboard,
│       │                     # admin catalog, quotations and other feature modules
│       └── tests/            # integration/regression tests; some features co-locate tests
└── backend/
    ├── requirements.txt
    ├── ADMIN_API_INTEGRATION.md
    ├── app/
    │   ├── main.py           # mounted routers, model registration, startup
    │   ├── api/              # auth, customers, products, plans, discounts
    │   ├── core/             # configuration, database, permissions, security, migration
    │   ├── models/           # SQLAlchemy entities; models alone are not complete APIs
    │   └── schemas/          # Pydantic request/response validation
    └── tests/                # real API, authorization and migration tests
```

## Financial integrity and security boundaries

- Store/transmit money as **integer minor units**: `150000` paise = INR 1,500.00. Assigned admin APIs reject floating-point, boolean and numeric-string amounts and enforce safe-integer bounds. Variant deltas may be signed; resolved unit price cannot be negative.
- Discount kind/value and scope/product combinations, date order and references are validated against the complete record on PATCH. `uses_count` is server-controlled; CRUD does not perform invoice redemptions. GST/tax configuration uses integer basis points in its frontend contract, but no tax engine/API is implemented.
- Planned billing applies discounts before tax, uses declared rounding, preserves immutable invoice line snapshots and consumes limited discounts once at confirmation. These are architecture requirements, **not delivered billing guarantees**. Current product prices must never replace historical invoice values.
- Collected cash, confirmed invoicing, outstanding balances and forecast income are different concepts. Never calculate business aggregates from an incomplete paginated list or label unavailable values as zero.
- Backend authorization is mandatory. CUSTOMER profile lookup is principal-scoped; customer subscription/invoice ownership reads remain unavailable until server enforcement is implemented. No client account_id filter establishes ownership.
- Passwords are Argon2-hashed; opaque session tokens are stored hashed in the database. The local session cookie is HttpOnly, SameSite=Lax and has a one-hour browser lifetime. CSRF uses cookie/header matching plus an exact trusted-Origin check on protected mutations.
- This is a development/hackathon build. HTTPS Secure-cookie deployment, session/CSRF binding and rotation, aligned server/browser session lifetimes, rate limiting and full recovery/provisioning need further hardening. Do not expose the development server as a production billing service.

## Supported hackathon demo

1. Start both services, open `/api/health` and Swagger, then open the app at `http://localhost:5173`.
2. Register a CUSTOMER through the UI, sign in, show its portal/session account view and unavailable billing states, then sign out. The separate own-profile API can be inspected in Swagger; portal profile editing is not connected.
3. Provision a local ADMIN as above and sign in. A missing reporting backend may produce an unavailable overview; navigate directly to catalog pages.
4. At `/app/catalog/products`, create a clearly named **demo** product and variant; refresh to show persistence. Use integer paise in API examples and let the UI format rupees.
5. At `/app/catalog/plans`, create a plan with availability dates and policy flags. At `/app/catalog/discounts`, create a valid fixed or percentage rule, filter it and update its active state.
6. Show authorization tests for STAFF/CUSTOMER boundaries. Do not present visible STAFF mutation controls as granted permissions; the backend rejects them.
7. Show quotation, subscription, invoice, report and portal billing screens only as integration work awaiting services. **Do not claim a quote became a subscription, an invoice was issued/paid, an email was delivered or revenue was collected.**

Use only a local demo database and label intentionally created demo records. No gateway, real payment, tax-compliance service or email delivery integration is configured by this setup.

## Troubleshooting and roadmap

| Symptom | Check / resolution |
| --- | --- |
| PowerShell blocks npm/activation | Use `npm.cmd` and the explicit `.venv\Scripts\python.exe` path |
| 403 on login or mutation | Open `localhost:5173`, retain cookies, bootstrap CSRF and send its matching header; never disable Origin/CSRF checks |
| Session cannot be verified | Check backend version and `/api/auth/me` includes User.id, account_id, role and csrf_token; bootstrap CSRF and sign in again. Do not substitute account IDs or tokens |
| Proxy failure / connection refused | Start Uvicorn on localhost:8000; check `/api/health`, the Vite proxy target and local host resolution |
| Port 5173 occupied | Stop or reuse your own existing frontend process; Vite strictPort will not silently choose another Origin |
| Table/column missing | Run from backend/, confirm SQLITE_URL points to the intended file, initialize through application startup; preserve the database and capture the error |
| Missing endpoint / 404 | Compare the mounted API table above with Swagger; unavailable finance/tax/quotation services are expected limitations |
| STAFF edit returns 403 | ADMIN-only configuration is intentional; frontend read-only controls still need alignment |
| Old phase notes disagree | Current mounted source/OpenAPI and integration notes take precedence over historical milestone summaries |

Next priorities are ownership-safe customer/subscription/invoice APIs, quotation transactions, tax/template integration, atomic invoice confirmation and idempotent payment recording, then verified financial reports and a real persisted end-to-end workflow. P1 Time Machine, Explain My Bill and Radar service integration follow core stability; forecast, plan switching and other advanced scenarios remain later milestones.

## Team and contribution guide

| Contributor | Primary responsibilities |
| --- | --- |
| **Abhishikth** | Frontend integration, router/shell/shared controls, authentication, customer/subscription/billing/dashboard/portal experiences; assigned admin backend completion |
| **Abiya** | Catalog/admin and quotation frontend modules, Radar and related operations features; assigned Taxes and Quotation Templates backend work |
| **Adithya** | Core backend/auth, customer/subscription/invoice/payment services, quotation transaction lifecycle, billing engine and reporting |

Read the specifications, inspect Git status and coordinate contracts before editing another owner's files. Keep commits scoped; preserve teammate changes and local databases, never commit secrets, virtual environments or build output, and never force-push shared history. Backend models/DTOs, frontend adapters and security tests must evolve together. Add real persisted API tests for authorization and financial changes; use honest unavailable states until contracts are verified.

## Specifications and integration notes

- [Product requirements and priorities](docs/PRD.md)
- [Architecture, API/data invariants and ownership](docs/ARCHITECTURE.md)
- [Design system and accessibility standards](docs/DESIGN.md)
- [Admin backend implementation, migration and handoff](backend/ADMIN_API_INTEGRATION.md)
- [P0 integration audit — historical evidence](frontend/src/app/P0_INTEGRATION.md)
- [Customer portal ownership dependencies](frontend/src/features/customer/PORTAL_INTEGRATION.md)
- [Invoice snapshots](frontend/src/features/billing/PHASE3A.md), [invoice safeguards/printing](frontend/src/features/billing/PHASE3B.md), [payment integration](frontend/src/features/billing/PHASE3C.md)
- [Dashboard/report dependencies](frontend/src/features/dashboard/PHASE3D.md)
- [Products](frontend/src/features/admin/products/API_DEPENDENCIES.md), [Plans](frontend/src/features/admin/plans/API_DEPENDENCIES.md), [Taxes](frontend/src/features/admin/taxes/API_DEPENDENCIES.md), [Discounts](frontend/src/features/admin/discounts/API_DEPENDENCIES.md), [Quotations](frontend/src/features/quotations/API_DEPENDENCIES.md)
