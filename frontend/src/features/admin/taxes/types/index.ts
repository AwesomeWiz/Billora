/**
 * Tax Rules domain types and conversion utilities.
 * Aligned with ARCHITECTURE.md §4.2 (`tax_rules`), PRD §4.5, and API specifications.
 * Tax rates are strictly represented and stored as integer basis points (0 <= rate_bps <= 10000).
 * (1% = 100 bps, 18% = 1800 bps, 28% = 2800 bps).
 */

export const TAX_SCOPES = ['GLOBAL', 'PRODUCT'] as const;
export type TaxScope = (typeof TAX_SCOPES)[number];

export const TAX_SCOPE_LABELS: Record<TaxScope, string> = {
  GLOBAL: 'All Products (Global)',
  PRODUCT: 'Product Specific',
};

export interface TaxRule {
  id: string;
  name: string;
  /** Integer basis points. e.g. 1800 for 18.00% */
  rate_bps: number;
  scope: TaxScope;
  /** Associated product ID when scope === 'PRODUCT' */
  product_id?: string | null;
  /** Associated product name for convenient display in lists */
  product_name?: string | null;
  /** ISO date string YYYY-MM-DD or ISO timestamp */
  effective_from?: string | null;
  /** Optional ISO date string YYYY-MM-DD or ISO timestamp */
  effective_to?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TaxListParams {
  search?: string;
  scope?: string;
  active?: string;
  page?: number;
  page_size?: number;
}

export interface TaxListResponse {
  items: TaxRule[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface CreateTaxInput {
  name: string;
  rate_bps: number;
  scope: TaxScope;
  product_id?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  active?: boolean;
}

export type UpdateTaxInput = Partial<CreateTaxInput>;

/**
 * Converts a human-readable percentage input string/number to integer basis points.
 * Validates range 0 <= bps <= 10000 (0% to 100%).
 * Returns null if invalid or out of range.
 * Examples:
 * - "18" -> 1800
 * - "18.5" -> 1850
 * - "5.25" -> 525
 * - "0" -> 0
 */
export function percentToBps(value: string | number): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 100) return null;
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Match non-negative percentage up to 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100);
}

/**
 * Converts integer basis points to human-readable percentage display string.
 * Examples:
 * - 1800 -> "18%" or "18.00%"
 * - 525 -> "5.25%"
 */
export function bpsToPercent(bps: number, formatted = false): string {
  if (!Number.isSafeInteger(bps)) return formatted ? '0%' : '0';
  const val = bps / 100;
  if (!formatted) {
    // If integer like 18.00, return "18", otherwise "18.5" or "18.25"
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
  }
  const str = Number.isInteger(val) ? val.toString() : val.toFixed(2);
  return `${str}%`;
}
