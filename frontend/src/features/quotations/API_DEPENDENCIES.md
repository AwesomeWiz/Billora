# Quotations & Quotation Templates API Dependencies & Integration Checklist

This document records the exact backend REST API contracts expected by `frontend/src/features/quotations/` and details the audit findings comparing the frontend implementation against the current backend state.

---

## 1. Backend Integration Audit Summary

### A. Current Backend State (Verified via Repository Inspection)
- **Active Backend Routers**: As verified in `backend/app/main.py`:
  - `app.api.auth` (mounted at `/api/auth`)
  - `app.api.products` (mounted at `/api/products`)
- **Quotation Routes**:
  - `GET /api/quotations` — **Awaiting verification / Not yet implemented in FastAPI router**.
  - `GET /api/quotations/{id}` — **Awaiting verification / Not yet implemented in FastAPI router**.
  - `POST /api/quotations` — **Awaiting verification / Not yet implemented in FastAPI router**.
  - `POST /api/quotations/{id}/confirm` — **Awaiting verification / Not yet implemented in FastAPI router**.
  - `GET,POST /api/quotation-templates` — **Awaiting verification / Not yet implemented in FastAPI router**.
  - `GET /api/quotation-templates/{id}` — **Awaiting verification / Not yet implemented in FastAPI router**.
- **Frontend Behavior**:
  - The frontend implementation does **not fake** successful backend responses or introduce mock persistence.
  - When the backend returns HTTP 404 (endpoint unmounted), `useQuotations` and `useQuotationTemplates` detect this explicitly via `isEndpointUnavailable` and display an honest amber notice banner with a non-blocking retry button.
  - Mutations (create and confirm) do not optimistically mutate local application state; state updates and success notifications occur only upon receiving a validated HTTP response from the backend.
  - Line-item calculations in the creation wizards are explicitly rendered as non-authoritative previews with disclaimers.

---

## 2. Integration Checklist (For Adithya's Review & Backend Mounting)

| Operation | Frontend Service Method | Expected Endpoint | Key Required Request Fields | Expected Response Fields | Current Backend Availability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Quotation list** | `quotationService.listQuotations(params)` | `GET /api/quotations` | Query: `search?`, `status?`, `account_id?`, `subscription_id?`, `from_date?`, `to_date?`, `page?`, `page_size?` | `{ items: Quotation[], total: number, page: number, page_size: number, has_next: boolean }` | **Not implemented / Awaiting verification** |
| **Quotation details** | `quotationService.getQuotation(id)` | `GET /api/quotations/{id}` | Path: `id` | `Quotation` (including `lines: QuotationLine[]`, `subscription: QuotationSubscriptionSummary`) | **Not implemented / Awaiting verification** |
| **Quotation creation** | `quotationService.createQuotation(input)` | `POST /api/quotations` | `{ account_id, template_id?, plan_id?, validity_days, terms?, lines: [{ source_product_id, variant_id?, quantity, unit_price_minor, tax_rule_id?, description? }] }` | Created `Quotation` (with generated sequence number, `valid_until`, linked `subscription_id`, minor paise totals) | **Not implemented / Awaiting verification** |
| **Quotation confirmation** | `quotationService.confirmQuotation(id)` | `POST /api/quotations/{id}/confirm` | Path: `id` | Updated `Quotation` (`status: "ACCEPTED"`, linked subscription transitioned to `"CONFIRMED"`) | **Not implemented / Awaiting verification** |
| **Quotation-template listing** | `quotationTemplateService.listTemplates(params)` | `GET /api/quotation-templates` | Query: `search?`, `plan_id?`, `active?`, `page?`, `page_size?` | `{ items: QuotationTemplate[], total: number, page: number, page_size: number, has_next: boolean }` | **Not implemented / Awaiting verification** |
| **Quotation-template creation** | `quotationTemplateService.createTemplate(input)` | `POST /api/quotation-templates` | `{ name, plan_id, validity_days, active?, lines: [{ product_id, variant_id?, quantity, unit_price_minor?, tax_rule_id? }] }` | Created `QuotationTemplate` | **Not implemented / Awaiting verification** |
| **Quotation-template details** | `quotationTemplateService.getTemplate(id)` | `GET /api/quotation-templates/{id}` | Path: `id` | Single `QuotationTemplate` | **Not implemented / Awaiting verification** |

---

## 3. Detailed API Contract Specification

### 3.1 List Quotations
- **Endpoint**: `GET /api/quotations`
- **Access Roles**: `ADMIN`, `STAFF`
- **Query Parameters**:
  - `search` (optional string): Case-insensitive match on quotation number or customer name.
  - `status` (optional string): Filter by `ISSUED | ACCEPTED | EXPIRED | CANCELLED`.
  - `account_id` (optional string): Filter by customer account ID.
  - `subscription_id` (optional string): Filter by linked subscription ID.
  - `from_date` (optional string): Issued-on filter in `YYYY-MM-DD` format.
  - `to_date` (optional string): Issued-on filter in `YYYY-MM-DD` format.
  - `page` (optional integer, default 1).
  - `page_size` (optional integer, default 10).
- **Response Shape (`QuotationListResponse`)**:
```json
{
  "items": [
    {
      "id": "quot_123",
      "number": "QT-2026-0001",
      "subscription_id": "sub_456",
      "account_id": "acc_789",
      "customer_name": "Acme Corp",
      "customer_email": "billing@acme.com",
      "template_id": "tpl_999",
      "template_name": "Enterprise Annual Template",
      "issued_on": "2026-10-31",
      "valid_until": "2026-11-30",
      "status": "ISSUED",
      "terms": "Net 30 payment terms.",
      "subtotal_minor": 15000000,
      "tax_minor": 2700000,
      "total_minor": 17700000,
      "lines": [
        {
          "id": "line_1",
          "quotation_id": "quot_123",
          "source_product_id": "prod_1",
          "product_name": "Cloud Platform",
          "variant_id": "var_1",
          "variant_name": "Pro Tier",
          "quantity": 2,
          "unit_price_minor": 7500000,
          "tax_rule_id": "tax_gst_18",
          "subtotal_minor": 15000000
        }
      ],
      "subscription": {
        "id": "sub_456",
        "code": "SUB-2026-001",
        "status": "QUOTATION"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "has_next": false
}
```

### 3.2 Get Single Quotation
- **Endpoint**: `GET /api/quotations/{id}`
- **Response**: Single `Quotation` JSON object.

### 3.3 Create Quotation
- **Endpoint**: `POST /api/quotations`
- **Access Roles**: `ADMIN`, `STAFF`
- **Request Body (`CreateQuotationInput`)**:
```json
{
  "account_id": "acc_789",
  "template_id": "tpl_999",
  "plan_id": "plan_enterprise",
  "validity_days": 30,
  "terms": "Net 30 payment terms.",
  "lines": [
    {
      "source_product_id": "prod_1",
      "variant_id": "var_1",
      "quantity": 2,
      "unit_price_minor": 7500000,
      "tax_rule_id": "tax_gst_18",
      "description": "Customized license count"
    }
  ]
}
```
- **Backend Responsibility**:
  1. Validates `account_id` existence.
  2. Generates human-readable sequence number (e.g. `QT-2026-XXXX`).
  3. Computes `valid_until = issued_on + validity_days`.
  4. Automatically provisions a linked `subscription` with initial status `QUOTATION`.
  5. Computes authoritative `subtotal_minor`, `tax_minor`, and `total_minor` using integer minor units.
- **Response**: Created `Quotation` object (HTTP 201).

### 3.4 Confirm Quotation
- **Endpoint**: `POST /api/quotations/{id}/confirm`
- **Access Roles**: `ADMIN`, `STAFF`
- **Lifecycle Invariants**:
  - Can only transition if current status is `ISSUED`.
  - If quotation validity is expired (`current_date > valid_until`), return HTTP 422 with code `QUOTATION_EXPIRED`.
  - On success:
    - Updates quotation status to `ACCEPTED`.
    - Transitions linked subscription from `QUOTATION` to `CONFIRMED`.
- **Response**: Updated `Quotation` object.

---

## 4. Financial Invariant Requirements
- All currency amounts are strictly represented in integer minor paise (e.g. `10000` paise = ₹100.00).
- Floating-point representations for money are strictly prohibited.
- Frontend calculations in the creation wizard are explicitly labeled as **non-authoritative estimates**; backend calculations remain authoritative for pricing, taxation, and billing.
