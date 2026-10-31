# Products & Variants Catalog API Integration Guide

## Backend Dependency Status (Owner: Adithya)

As verified during inspection of `backend/app/api/`:
- Currently only `auth.py` is mounted.
- The catalog API router (`/api/products`) is **pending implementation** by Adithya.
- The frontend module (`frontend/src/features/admin/products`) is built strictly against the architectural specifications (`ARCHITECTURE.md` §4.2, §7.1, §7.3) and shared API client (`frontend/src/lib/api/client.ts`).

## Required Endpoints & Schemas

### 1. `GET /api/products`
Query parameters:
- `search` (string, optional): Search product name
- `type` (string, optional): One of `'SOFTWARE' | 'SERVICE' | 'HARDWARE' | 'OTHER'`
- `active` (string, optional): `'true' | 'false'`
- `page` (integer, default 1)
- `page_size` (integer, default 20)

Expected response:
```json
{
  "items": [
    {
      "id": "prod_1",
      "name": "Helpdesk Pro",
      "type": "SOFTWARE",
      "sales_price_minor": 150000,
      "cost_price_minor": 80000,
      "currency": "INR",
      "notes": "Core ticketing and SLA module",
      "active": true,
      "variant_count": 1,
      "created_at": "2026-10-31T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```
*(The frontend also supports a flat array `Product[]` for backward compatibility).*

### 2. `POST /api/products`
Protected by CSRF (`X-CSRF-Token` header) and Admin session.
Request body:
```json
{
  "name": "Helpdesk Pro",
  "type": "SOFTWARE",
  "sales_price_minor": 150000,
  "cost_price_minor": 80000,
  "currency": "INR",
  "notes": "Core ticketing and SLA module",
  "active": true
}
```
Response: `201 Created` with created `Product` object.

### 3. `GET /api/products/{id}`
Response: `Product` object.

### 4. `PATCH /api/products/{id}`
Protected by CSRF and Admin session.
Request body: Partial product fields (`name`, `type`, `sales_price_minor`, `cost_price_minor`, `notes`, `active`).
Response: `Product` object.

### 5. `GET /api/products/{id}/variants`
Response:
```json
[
  {
    "id": "var_1",
    "product_id": "prod_1",
    "attribute_name": "brand",
    "attribute_value": "Odoo",
    "price_delta_minor": 56000,
    "active": true,
    "created_at": "2026-10-31T00:00:00Z"
  }
]
```

### 6. `POST /api/products/{id}/variants`
Protected by CSRF and Admin session.
Request body:
```json
{
  "attribute_name": "brand",
  "attribute_value": "Odoo",
  "price_delta_minor": 56000,
  "active": true
}
```
Response: `201 Created` with created `ProductVariant` object.

### 7. `PATCH /api/products/{id}/variants/{variant_id}`
Protected by CSRF and Admin session.
Request body: Partial `ProductVariant` fields.
Response: Updated `ProductVariant` object.

### 8. `DELETE /api/products/{id}/variants/{variant_id}`
Protected by CSRF and Admin session.
Response: `204 No Content`.

## Financial Precision Standard
- All amounts in API requests and responses are strictly non-negative integers in minor units (paise for INR).
- Floating-point rupee numbers are forbidden in persistence, calculations, and network payloads.
