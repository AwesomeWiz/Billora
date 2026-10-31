/**
 * Quotation Templates domain types and conversion utilities.
 * Aligned with ARCHITECTURE.md §4.2 (`quotation_templates`, `quotation_template_lines`),
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
