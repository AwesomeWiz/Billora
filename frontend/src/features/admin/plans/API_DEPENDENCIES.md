# Subscription Plans Catalog API Integration Guide

## Backend Status

The `/api/plans` router is mounted. Plan creation and updates require an authenticated `ADMIN` session, a matching CSRF cookie/header, and the trusted `http://localhost:5173` Origin. `STAFF` and `CUSTOMER` users cannot mutate plans. Listing and detail reads remain available to authenticated or anonymous callers as currently implemented.

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
