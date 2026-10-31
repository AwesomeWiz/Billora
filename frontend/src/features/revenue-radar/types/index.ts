/**
 * Revenue Leak Radar domain types and detection rules.
 * Aligned with ARCHITECTURE.md §6.6, §7 (GET /api/alerts/revenue-leaks),
 * and PRD §5.2 (DF-RADAR).
 */

export type LeakSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type LeakRule =
  | 'BILLING_MISSED'
  | 'INVOICE_OVERDUE'
  | 'BILLING_BLOCKED'
  | 'INVOICE_ANOMALY'
  | (string & {});

export type LeakEntityType = 'subscription' | 'invoice' | (string & {});

export interface RevenueLeakFinding {
  finding_key: string;
  rule: LeakRule;
  severity: LeakSeverity;
  title: string;
  entity_type: LeakEntityType;
  entity_id: string;
  explanation: string;
  suggested_action?: string;
  // Optional enriched fields (displayed only when supplied by the API)
  customer_name?: string;
  customer_id?: string;
  detected_at?: string;
  amount_at_risk_minor?: number | null;
  currency?: string;
}

export interface RevenueLeakSummary {
  missed_billing_count?: number;
  overdue_invoice_count?: number;
  total_value_at_risk_minor?: number | null;
  currency?: string;
}

export interface RevenueLeakResponse {
  findings: RevenueLeakFinding[];
  summary?: RevenueLeakSummary;
}

export interface LeakRadarFilterParams {
  severity?: string;
  rule?: string;
  search?: string;
}

export const LEAK_RULE_LABELS: Record<string, { label: string; description: string }> = {
  BILLING_MISSED: {
    label: 'Missed Billing Cycle',
    description: 'Active subscription has a billing cycle due in the past without a processed invoice or billing cycle record.',
  },
  INVOICE_OVERDUE: {
    label: 'Overdue Unpaid Invoice',
    description: 'Confirmed collectible invoice has an unpaid balance past its contractual payment due date.',
  },
  BILLING_BLOCKED: {
    label: 'Blocked Billing Configuration',
    description: 'Active due subscription is missing required plan or pricing configuration, preventing invoice issuance.',
  },
  INVOICE_ANOMALY: {
    label: 'Invoice Review Finding',
    description: 'Invoice amount differs from deterministic recomputation; marked for operational review (not fraud).',
  },
};

