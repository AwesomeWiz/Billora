# Discounts Management — Backend API Integration Contract & Dependencies

> **Document Status:** Authoritative API Contract Specification  
> **Author:** Abiya (Admin & Business Operations Frontend)  
> **Target Audience:** Adithya (Backend / Billing Engine), Abhishikth (Integration / Routing)  
> **Reference:** `docs/PRD.md` §4.6, `docs/ARCHITECTURE.md` §4.2, §4.6, §7  

This document outlines the API endpoints, schemas, constraints, and error behaviors required by the frontend Discounts module.

---

## 1. Required Endpoints

| Method | Endpoint | Authorized Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/discounts` | `ADMIN`, `STAFF` | List discount rules with pagination and filters |
| `POST` | `/api/discounts` | `ADMIN` | Create a new discount rule |
| `GET` | `/api/discounts/{id}` | `ADMIN`, `STAFF` | Get details of a specific discount rule |
| `PATCH` | `/api/discounts/{id}` | `ADMIN` | Update an existing discount rule or toggle active state |

---

## 2. Data Models & Schemas

### `DiscountRule` (Response Schema)

```json
{
  "id": "disc_8f430541",
  "name": "Festive 15% Off Subscriptions",
  "kind": "PERCENT",
  "value_minor": null,
  "percent_bps": 1500,
  "min_quantity": 1,
  "min_purchase_minor": 50000,
  "starts_on": "2026-11-01",
  "ends_on": "2026-12-31",
  "max_uses": 500,
  "uses_count": 42,
  "scope": "SUBSCRIPTION",
  "product_id": null,
  "product_name": null,
  "priority": 10,
  "active": true,
  "created_at": "2026-10-31T12:00:00Z",
  "updated_at": "2026-10-31T12:00:00Z"
}
```

### Constraints & Invariants

1. **Kind:** `FIXED` or `PERCENT`.
   - When `kind === 'FIXED'`, `value_minor` (integer paise, non-negative) is required, and `percent_bps` must be `null`.
   - When `kind === 'PERCENT'`, `percent_bps` (integer basis points, `0 <= percent_bps <= 10000`) is required, and `value_minor` must be `null`.
2. **Scope:** `SUBSCRIPTION` or `PRODUCT`.
   - When `scope === 'PRODUCT'`, `product_id` is mandatory and must reference a valid product ID.
   - When `scope === 'SUBSCRIPTION'`, `product_id` must be `null`.
3. **Usage Limits:**
   - `uses_count` is server-maintained and read-only.
   - `max_uses` is nullable (meaning unlimited redemptions).
4. **Dates:**
   - `starts_on` and `ends_on` format: ISO date `YYYY-MM-DD` or ISO timestamp.
   - `ends_on >= starts_on` when both are supplied.
5. **Priority:**
   - Integer value used for conflict resolution / tie-breaking when multiple non-stacking rules qualify.
6. **Authorization:**
   - Staff may read discount rules. Mutations (`POST`, `PATCH`) must return `403 Forbidden` for non-admin callers.

---

## 3. Query Parameters for `GET /api/discounts`

- `page`: 1-based page index (e.g. `1`).
- `page_size`: Number of records per page (default `20`).
- `search`: Case-insensitive substring match against `name`.
- `kind`: Filter by `FIXED` or `PERCENT`.
- `scope`: Filter by `SUBSCRIPTION` or `PRODUCT`.
- `active`: Filter by `'true'` or `'false'`.

---

## 4. Current Backend Status & Questions for Adithya

- `/api/discounts` is currently not yet mounted in FastAPI `backend/app/main.py`. The frontend detects `404` and displays a non-blocking informational warning banner.
- Please confirm if `uses_count` is incremented upon invoice creation or upon invoice confirmation (`docs/ARCHITECTURE.md` §4.2 notes redemptions consume only upon invoice confirmation).
