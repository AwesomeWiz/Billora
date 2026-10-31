/**
 * Quotation Templates and Full Quotations domain types and conversion utilities.
 * Aligned with ARCHITECTURE.md §4.2 (`quotation_templates`, `quotation_template_lines`, `quotations`, `quotation_lines`, `subscriptions`),
 * PRD §4.3 (FR-QUOTE-01, FR-QUOTE-02, FR-QUOTE-03), and API specifications.
 */

export interface QuotationTemplateLine {
  id?: string;
  template_id?: string;
  product_id: string;
  product_name?: string;
  variant_id?: string | null;
  variant_name?: string | null;
  /** Quantity of product units (integer >= 1) */
  quantity: number;
  /** Optional unit price in integer paise (INR). Nullable if defaulting to product catalog price */
  unit_price_minor?: number | null;
  /** Optional associated tax rule id */
  tax_rule_id?: string | null;
  tax_rule_name?: string | null;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  plan_id: string;
  plan_name?: string;
  /** Validity duration in days (> 0) */
  validity_days: number;
  active: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  lines: QuotationTemplateLine[];
}

export interface QuotationTemplateListParams {
  search?: string;
  plan_id?: string;
  active?: string;
  page?: number;
  page_size?: number;
}

export interface QuotationTemplateListResponse {
  items: QuotationTemplate[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface CreateQuotationTemplateLineInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price_minor?: number | null;
  tax_rule_id?: string | null;
}

export interface CreateQuotationTemplateInput {
  name: string;
  plan_id: string;
  validity_days: number;
  active?: boolean;
  lines: CreateQuotationTemplateLineInput[];
}

/**
 * Quotation statuses according to PRD §4.3 and ARCHITECTURE.md §4.2.
 */
export type QuotationStatus = 'ISSUED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

/**
 * Subscription statuses according to ARCHITECTURE.md §4.2 lifecycle:
 * DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
 */
export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'PENDING_CANCEL'
  | 'CANCELLED'
  | 'CLOSED'
  | 'EXPIRED';

export interface QuotationLine {
  id?: string;
  quotation_id?: string;
  source_product_id: string;
  variant_id?: string | null;
  product_name?: string;
  variant_name?: string | null;
  description?: string | null;
  /** Quantity of product units (integer >= 1) */
  quantity: number;
  /** Unit price in integer minor paise (INR) */
  unit_price_minor: number;
  /** Associated tax rule id if configured */
  tax_rule_id?: string | null;
  tax_rule_name?: string | null;
  /** Computed line subtotal in minor paise (quantity * unit_price_minor) */
  subtotal_minor?: number;
}

export interface QuotationSubscriptionSummary {
  id: string;
  code?: string;
  status: SubscriptionStatus;
  plan_id?: string;
  plan_name?: string;
  account_id?: string;
}

export interface Quotation {
  id: string;
  number: string;
  subscription_id: string;
  account_id: string;
  customer_name?: string;
  customer_email?: string;
  template_id?: string | null;
  template_name?: string | null;
  issued_on: string;
  valid_until: string;
  status: QuotationStatus;
  terms?: string | null;
  subtotal_minor?: number;
  tax_minor?: number;
  total_minor?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  lines: QuotationLine[];
  subscription?: QuotationSubscriptionSummary | null;
}

export interface QuotationListParams {
  search?: string;
  status?: QuotationStatus | '';
  account_id?: string;
  subscription_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface CreateQuotationLineInput {
  source_product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price_minor: number;
  tax_rule_id?: string | null;
  description?: string | null;
}

export interface CreateQuotationInput {
  account_id: string;
  template_id?: string | null;
  plan_id?: string | null;
  validity_days?: number;
  valid_until?: string;
  terms?: string | null;
  lines: CreateQuotationLineInput[];
}

/**
 * Converts human rupees string/number to integer minor paise.
 */
export function rupeesToPaise(value: string | number): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

/**
 * Converts integer minor paise to formatted or plain rupee string.
 */
export function paiseToRupees(paise: number, formatted = false): string {
  if (!Number.isSafeInteger(paise) || paise < 0) return formatted ? '₹0.00' : '0';
  const val = paise / 100;
  if (!formatted) {
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}
