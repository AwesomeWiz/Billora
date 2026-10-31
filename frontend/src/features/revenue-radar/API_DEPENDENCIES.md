# Revenue Leak Radar API Dependencies

This document details the backend REST API contract for the **Revenue Leak Radar (P1)** module.

---

## 1. Backend Endpoint Overview

- **Endpoint**: `GET /api/alerts/revenue-leaks`
- **Access Roles**: `ADMIN`, `STAFF`
- **Method**: `GET`
- **Current Backend Availability**: **Awaiting verification / Not yet mounted in FastAPI router** (`backend/app/main.py`).

---

## 2. API Contract Specification

### Response Shape

The frontend accepts either a direct list array (`RevenueLeakFinding[]`) or an enriched envelope containing optional summary aggregates:

```json
{
  "summary": {
    "missed_billing_count": 3,
    "overdue_invoice_count": 5,
    "total_value_at_risk_minor": 14500000,
    "currency": "INR"
  },
  "findings": [
    {
      "finding_key": "INVOICE_OVERDUE:inv-uuid-101",
      "rule": "INVOICE_OVERDUE",
      "severity": "HIGH",
      "title": "Invoice is overdue",
      "entity_type": "invoice",
      "entity_id": "inv-uuid-101",
      "explanation": "This confirmed invoice has an unpaid balance after its due date.",
      "suggested_action": "OPEN_INVOICE",
      "customer_name": "Acme Corp",
      "customer_id": "acc-101",
      "detected_at": "2026-10-31T09:00:00Z",
      "amount_at_risk_minor": 5500000,
      "currency": "INR"
    },
    {
      "finding_key": "BILLING_MISSED:sub-uuid-202",
      "rule": "BILLING_MISSED",
      "severity": "HIGH",
      "title": "Subscription missed billing cycle",
      "entity_type": "subscription",
      "entity_id": "sub-uuid-202",
      "explanation": "Active subscription has a billing cycle due before today but no corresponding processed billing cycle.",
      "suggested_action": "TRIGGER_BILLING_CYCLE",
      "customer_name": "Globex Inc",
      "customer_id": "acc-202",
      "detected_at": "2026-10-31T09:00:00Z",
      "amount_at_risk_minor": 9000000,
      "currency": "INR"
    }
  ]
}
```

### Detection Rules (From ARCHITECTURE.md §6.6):
1. `BILLING_MISSED`: Active subscription has a billing cycle due in the past without a processed invoice or billing cycle record.
2. `INVOICE_OVERDUE`: Confirmed collectible invoice has an unpaid balance past its contractual due date.
3. `BILLING_BLOCKED`: Active due subscription is missing required plan or pricing configuration, preventing invoice generation.
4. `INVOICE_ANOMALY`: Invoice amount discrepancy against deterministic recomputation; marked as an operational review finding, never fraud.

### Required Fields for Each Finding:
- `finding_key` (string, unique identifier for alert deduplication)
- `rule` (`BILLING_MISSED` | `INVOICE_OVERDUE` | `BILLING_BLOCKED` | `INVOICE_ANOMALY` | string)
- `severity` (`HIGH` | `MEDIUM` | `LOW`)
- `title` (string, human-readable issue title)
- `entity_type` (`invoice` | `subscription` | string)
- `entity_id` (string, UUID or reference ID of affected entity)
- `explanation` (string, clear explanation of the financial condition)

### Optional Fields (Displayed only when provided by backend):
- `suggested_action` (string, recommended operational resolution)
- `customer_name` (string)
- `customer_id` (string)
- `detected_at` (ISO timestamp string)
- `amount_at_risk_minor` (integer minor paise; e.g. `5500000` = ₹55,000.00)
- `currency` (string, default `INR`)

---

## 3. Financial and Calculation Invariants

- **Authoritative Calculations**: Frontend does not manufacture financial estimates, probabilities, or artificial "risk scores".
- **Paise Precision**: All monetary values (`amount_at_risk_minor`, `total_value_at_risk_minor`) must strictly be integer minor paise.
- **Safe Navigation**: The UI links to `/app/invoices/:id` or `/app/subscriptions/:id` only when the entity type and entity ID are valid.
- **No Client Dismissals**: Findings must resolve dynamically via backend recomputation on refresh, not client-side simulated state.

