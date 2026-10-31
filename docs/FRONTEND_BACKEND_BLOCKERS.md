# Billora — Frontend-Backend Integration Blockers

Owner: Abiya (Admin & Operations Frontend)  
Recipient: Adithya (Backend, APIs & Financial Correctness)  
Updated: 2026-10-31

This document specifies the current status of all backend endpoints required by the frontend application, the exact request/response schemas expected, authentication requirements, and current blockers.

---

## 1. Summary of Mounted Backend Endpoints

Currently mounted and verified in `backend/app/main.py`:
- `/api/auth/*` (register, login, logout, me, csrf)
- `/api/products/*` (list, create, detail, update, variants)
- `/api/plans/*` (list, create, detail, update)
- `/api/customers/*` (profile, list, customer context)
- `/api/discounts/*` (list, create, detail, update, max_uses check)

All other domain services remain **unmounted** in FastAPI, returning HTTP 404.

---

## 2. Unmounted Endpoint Specifications & Blockers

### A. Taxes Management (`/api/taxes`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/taxes`, `POST /api/taxes`, `GET /api/taxes/{id}`, `PATCH /api/taxes/{id}`
- **Currency & Rate Rule:** Rates must be stored in basis points (`rate_basis_points`, integer e.g., 1800 for 18.00%).

### B. Quotations & Quotation Templates (`/api/quotations`, `/api/quotation-templates`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/quotation-templates`, `POST /api/quotation-templates`, `GET /api/quotations`, `POST /api/quotations`, `POST /api/quotations/{id}/confirm`
- **Contract Reference:** Documented in `frontend/src/features/quotations/API_DEPENDENCIES.md`.

### C. Revenue Leak Radar (`/api/alerts/revenue-leaks`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/alerts/revenue-leaks`
- **Contract Reference:** Documented in `frontend/src/features/revenue-radar/API_DEPENDENCIES.md`.

### D. Activity Timeline (`/api/activity`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/activity`
- **Params:** `page`, `page_size`, `event_type`, `entity_type`, `search`, `from_date`, `to_date`

### E. Notifications Center (`/api/notifications`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`

### F. CSV Data Import (`/api/imports`)
- **Status:** Unmounted (404)
- **Method:** `POST /api/imports/preview` (FormData: `file`, `entity_type`), `POST /api/imports/validate`, `POST /api/imports`

### G. GST Compliance & Intelligence (`/api/gst/*`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/gst/settings`, `PATCH /api/gst/settings`, `GET /api/gst/intelligence`, `GET /api/gst/errors`, `POST /api/gst/errors/{id}/approve`
