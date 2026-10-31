# Billora — Frontend-Backend Integration Blockers

Owner: Abiya (Admin & Operations Frontend)  
Recipient: Adithya (Backend, APIs & Financial Correctness)  
Date: 2026-10-31

This document specifies the status of all backend endpoints required by the frontend application, the exact request/response schemas expected, authentication requirements, and current blockers.

---

## 1. Summary of Mounted Backend Endpoints

Currently mounted in `backend/app/main.py`:
- `/api/auth/*` (register, login, logout, me, csrf)
- `/api/products/*` (list, create, detail, update)
- `/api/plans/*` (list, create, detail, update)

All other domain services are **unmounted** in FastAPI, returning HTTP 404.

---

## 2. Unmounted Endpoint Specifications & Blockers

### A. Activity Timeline (`/api/activity` or `/api/audit-logs`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/activity`
- **Query Parameters:** `page`, `page_size`, `event_type`, `entity_type`, `search`, `from_date`, `to_date`
- **Expected Response:**
  ```json
  {
    "items": [
      {
        "id": "act_01...",
        "timestamp": "2026-10-31T12:00:00Z",
        "actor": {
          "id": "usr_01...",
          "name": "Jane Admin",
          "email": "admin@billora.com",
          "role": "ADMIN"
        },
        "event_type": "SUBSCRIPTION_CREATED",
        "entity_type": "subscription",
        "entity_id": "sub_01...",
        "entity_label": "SUB-2026-001",
        "description": "Subscription created for Acme Corp under Enterprise Monthly plan.",
        "metadata": {}
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "has_next": false
  }
  ```
- **Auth:** ADMIN, STAFF session cookie.

---

### B. Notifications Center (`/api/notifications`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/notifications`
  - Query: `page`, `page_size`, `unread_only`, `category`
- **Method:** `POST /api/notifications/{id}/read`
  - Body: none
- **Method:** `POST /api/notifications/read-all`
  - Body: none
- **Expected Item Schema:**
  ```json
  {
    "id": "notif_01...",
    "created_at": "2026-10-31T12:30:00Z",
    "category": "BILLING",
    "title": "Invoice Generated",
    "message": "Invoice INV-2026-042 generated for Acme Corp (₹14,999.00).",
    "is_read": false,
    "read_at": null,
    "entity_type": "invoice",
    "entity_id": "inv_01..."
  }
  ```

---

### C. Taxes Management (`/api/taxes`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/taxes`, `POST /api/taxes`, `GET /api/taxes/{id}`, `PATCH /api/taxes/{id}`
- **Currency & Rate Rule:** Rates must be stored in basis points (`rate_basis_points`, integer e.g., 1800 for 18.00%).

---

### D. Discounts Management (`/api/discounts`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/discounts`, `POST /api/discounts`, `GET /api/discounts/{id}`, `PATCH /api/discounts/{id}`
- **Currency & Value Rule:** Fixed discounts in integer paise (`fixed_amount_minor`). Percentage discounts in basis points (`percentage_basis_points`).

---

### E. Quotation Templates (`/api/quotation-templates`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/quotation-templates`, `POST /api/quotation-templates`, `GET /api/quotation-templates/{id}`

---

### F. Quotations Management (`/api/quotations`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/quotations`, `POST /api/quotations`, `GET /api/quotations/{id}`, `POST /api/quotations/{id}/confirm`

---

### G. Revenue Leak Radar (`/api/alerts/revenue-leaks`)
- **Status:** Unmounted (404)
- **Method:** `GET /api/alerts/revenue-leaks`
- **Contract Reference:** Documented in `frontend/src/features/revenue-radar/API_DEPENDENCIES.md`.

