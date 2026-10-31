# Quotation Templates — Backend API Integration Contract & Dependencies

> **Document Status:** Authoritative API Contract Specification  
> **Author:** Abiya (Admin & Business Operations Frontend)  
> **Target Audience:** Adithya (Backend / Billing Engine), Abhishikth (Integration / Routing)  
> **Reference:** `docs/PRD.md` §4.3 (FR-QUOTE-01, FR-QUOTE-02, FR-QUOTE-03), `docs/ARCHITECTURE.md` §4.2, §7  

This document outlines the API endpoints, schemas, constraints, and error behaviors required by the frontend Quotation Templates module.

---

## 1. Documented Endpoints

| Method | Endpoint | Authorized Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/quotation-templates` | `ADMIN`, `STAFF` | List reusable quotation templates with filter & pagination |
| `POST` | `/api/quotation-templates` | `ADMIN`, `STAFF` | Create a new reusable quotation template with lines |
| `GET` | `/api/quotation-templates/{id}` | `ADMIN`, `STAFF` | Fetch full template details including lines |

*Note on Editing / Updates:* Per `docs/ARCHITECTURE.md` §7, only `GET`, `POST /api/quotation-templates` and `GET /api/quotation-templates/{id}` are documented. No `PATCH` endpoint is specified for quotation templates. Templates are treated as immutable blueprints once created. If editing is desired in future releases, a `PATCH /api/quotation-templates/{id}` contract must be coordinated with Adithya.

---

## 2. Data Models & Schemas

### `QuotationTemplate` (Response Schema)

```json
{
  "id": "tpl_7f8a91b2",
  "name": "Standard SaaS Starter Package",
  "plan_id": "plan_starter_monthly",
  "plan_name": "Starter Monthly",
  "validity_days": 30,
  "active": true,
  "created_by": "user_admin_1",
  "created_at": "2026-10-31T10:00:00Z",
  "updated_at": "2026-10-31T10:00:00Z",
  "lines": [
    {
      "id": "tpl_line_1",
      "template_id": "tpl_7f8a91b2",
      "product_id": "prod_erp_core",
      "product_name": "Brightloop ERP Core",
      "variant_id": "var_cloud_managed",
      "variant_name": "Cloud Managed (+₹560)",
      "quantity": 1,
      "unit_price_minor": 150000,
      "tax_rule_id": "tax_gst_18",
      "tax_rule_name": "GST 18%"
    }
  ]
}
```

### `CreateQuotationTemplateInput` (Request Schema)

```json
{
  "name": "Standard SaaS Starter Package",
  "plan_id": "plan_starter_monthly",
  "validity_days": 30,
  "active": true,
  "lines": [
    {
      "product_id": "prod_erp_core",
      "variant_id": "var_cloud_managed",
      "quantity": 1,
      "unit_price_minor": 150000,
      "tax_rule_id": "tax_gst_18"
    }
  ]
}
```

### Constraints & Invariants

1. **Validity:** `validity_days` must be an integer `> 0` (e.g. 15, 30, 60 days).
2. **Quantities:** Each line `quantity` must be an integer `>= 1`.
3. **Prices:** `unit_price_minor` is in integer minor paise (e.g. `₹1,500.00` = `150000`). If omitted/null, it defaults to the product catalog sales price.
4. **Variants:** `variant_id` is optional, but if specified, it must belong to the selected `product_id`.
5. **Roles:** Both `ADMIN` and `STAFF` have permission to list, read, and create quotation templates. `CUSTOMER` users are forbidden (`403 Forbidden`).

---

## 3. Current Backend Status & Questions for Adithya

- `/api/quotation-templates` is not yet mounted in `backend/app/main.py`. The frontend gracefully detects 404 and displays an informational warning banner.
- Please confirm if `unit_price_minor` on template lines is mandatory or optional (nullable). The frontend supports both, defaulting to optional catalog price when left blank.
