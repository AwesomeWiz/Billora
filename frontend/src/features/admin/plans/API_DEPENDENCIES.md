# Subscription Plans Catalog API Integration Guide

## Backend Dependency Status (Owner: Adithya)

As verified during inspection of `backend/app/api/`:
- `auth.py` and `products.py` are mounted.
- The subscription plans API router (`/api/plans`) is **pending implementation** by Adithya.
- The frontend module (`frontend/src/features/admin/plans`) is built strictly against `ARCHITECTURE.md` §4.2, PRD §4.3 and the shared API client (`frontend/src/lib/api/client.ts`).

## Required Endpoints & Schemas

### 1. `GET /api/plans`
Query parameters:
- `search` (string, optional): Case-insensitive search on plan name
- `billing_interval` (string, optional): One of `'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'`
- `active` (string, optional): `'true' | 'false'`
- `page` (integer, default 1)
- `page_size` (integer, default 20)

Expected response:
```json
{
  "items": [
    {
      "id": "plan_monthly",
      "name": "Enterprise Monthly",
      "base_fee_minor": 150000,
      "bill_plan_base_fee": true,
      "billing_interval": "MONTHLY",
      "min_quantity": 1,
      "available_from": "2026-10-31",
      "available_to": null,
      "currency": "INR",
      "auto_close": true,
      "can_close_early": true,
      "can_pause": true,
      "can_renew": true,
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
*(The frontend also transparently normalizes flat array `Plan[]` responses).*

### 2. `POST /api/plans`
Protected by CSRF (`X-CSRF-Token` header) and Admin session.
Request body:
```json
{
  "name": "Enterprise Monthly",
  "base_fee_minor": 150000,
  "bill_plan_base_fee": true,
  "billing_interval": "MONTHLY",
  "min_quantity": 1,
  "available_from": "2026-10-31",
  "available_to": null,
  "currency": "INR",
  "auto_close": true,
  "can_close_early": true,
  "can_pause": true,
  "can_renew": true,
  "active": true
}
```
Response: `201 Created` with created `Plan` object.

### 3. `GET /api/plans/{id}`
Response: `Plan` object.

### 4. `PATCH /api/plans/{id}`
Protected by CSRF and Admin session.
Request body: Partial `CreatePlanInput` fields.
Response: Updated `Plan` object.

## Financial & Pricing Model Contract
- `base_fee_minor` is strictly an integer in minor units (e.g. `150000` paise = ₹1,500.00).
- When `bill_plan_base_fee` is `true`, the plan base fee is an explicit recurring line on generated subscription invoices.
- When `bill_plan_base_fee` is `false`, the base fee is informational/display-only, and invoices bill solely for itemized subscription line products.
