# Tax Rules API Integration Guide

## Backend Dependency Status (Owner: Adithya)

As verified during inspection of `backend/app/api/`:
- `auth.py` and `products.py` are mounted.
- The taxes router (`/api/taxes`) is **pending backend implementation** by Adithya.
- The frontend module (`frontend/src/features/admin/taxes`) is built strictly against `ARCHITECTURE.md` §4.2 (`tax_rules`), PRD §4.5, and the shared API client (`frontend/src/lib/api/client.ts`).

## Required Endpoints & Schemas

### 1. `GET /api/taxes`
Query parameters:
- `search` (string, optional): Search by tax name
- `scope` (string, optional): One of `'GLOBAL' | 'PRODUCT'`
- `active` (string, optional): `'true' | 'false'`
- `page` (integer, default 1)
- `page_size` (integer, default 20)

Expected response:
```json
{
  "items": [
    {
      "id": "tax_gst_18",
      "name": "GST 18%",
      "rate_bps": 1800,
      "scope": "GLOBAL",
      "product_id": null,
      "product_name": null,
      "effective_from": "2026-10-31",
      "effective_to": null,
      "active": true,
      "created_at": "2026-10-31T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```
*(The frontend also transparently normalizes flat array `TaxRule[]` responses).*

### 2. `POST /api/taxes`
Protected by CSRF (`X-CSRF-Token` header) and Admin session.
Request body:
```json
{
  "name": "GST 18%",
  "rate_bps": 1800,
  "scope": "GLOBAL",
  "product_id": null,
  "effective_from": "2026-10-31",
  "effective_to": null,
  "active": true
}
```
Response: `201 Created` with created `TaxRule` object.

### 3. `GET /api/taxes/{id}`
Response: `TaxRule` object.

### 4. `PATCH /api/taxes/{id}`
Protected by CSRF and Admin session.
Request body: Partial `CreateTaxInput` fields (e.g. `{ "active": false }` or `{ "rate_bps": 1200 }`).
Response: Updated `TaxRule` object.

## Scope & Basis Points Precision Standard
- `rate_bps` is strictly represented as integer basis points (`0 <= rate_bps <= 10000`), representing 0% through 100.00%. Floating-point percentages are never transmitted.
- `scope`:
  - `GLOBAL`: Applies across all items subject to taxation.
  - `PRODUCT`: Targets a specific `product_id`.
- Dates use ISO date strings (`YYYY-MM-DD`).
