/**
 * Discount Rules domain types and conversion utilities.
 * Aligned with ARCHITECTURE.md §4.2 (`discount_rules`), PRD §4.6, and API specifications.
 *
 * Types:
 * - FIXED: uses value_minor (integer paise in INR, e.g. 10000 = ₹100.00). percent_bps must not be submitted.
 * - PERCENT: uses percent_bps (integer basis points, 0 <= percent_bps <= 10000, e.g. 1500 = 15.00%). value_minor must not be submitted.
 *
 * Scopes:
 * - PRODUCT: Product-specific discount, requires product_id.
 * - SUBSCRIPTION: Whole-subscription / order discount.
 */

export const DISCOUNT_KINDS = ['FIXED', 'PERCENT'] as const;
export type DiscountKind = (typeof DISCOUNT_KINDS)[number];

export const DISCOUNT_KIND_LABELS: Record<DiscountKind, string> = {
  FIXED: 'Fixed Amount (₹)',
  PERCENT: 'Percentage (%)',
};

export const DISCOUNT_SCOPES = ['SUBSCRIPTION', 'PRODUCT'] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPES)[number];

export const DISCOUNT_SCOPE_LABELS: Record<DiscountScope, string> = {
  SUBSCRIPTION: 'Whole Subscription',
  PRODUCT: 'Product Specific',
};

export interface DiscountRule {
  id: string;
  name: string;
  kind: DiscountKind;
  /** Value in integer paise when kind === 'FIXED' */
  value_minor?: number | null;
  /** Percentage in integer basis points (0-10000) when kind === 'PERCENT' */
  percent_bps?: number | null;
  /** Minimum quantity required to trigger discount */
  min_quantity?: number | null;
  /** Minimum purchase amount in integer paise */
  min_purchase_minor?: number | null;
  /** ISO date string YYYY-MM-DD or timestamp */
  starts_on?: string | null;
  /** ISO date string YYYY-MM-DD or timestamp */
  ends_on?: string | null;
  /** Maximum number of redemptions allowed across all invoices (null if unlimited) */
  max_uses?: number | null;
  /** Server-maintained count of redemptions. Read-only. */
  uses_count: number;
  scope: DiscountScope;
  /** Associated product ID when scope === 'PRODUCT' */
  product_id?: string | null;
  /** Associated product name for convenient display in tables */
  product_name?: string | null;
  /** Priority ordering for non-stacking conflict resolution (higher = evaluated first) */
  priority: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DiscountListParams {
  search?: string;
  kind?: string;
  scope?: string;
  active?: string;
  page?: number;
  page_size?: number;
}

export interface DiscountListResponse {
  items: DiscountRule[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface CreateDiscountInput {
  name: string;
  kind: DiscountKind;
  value_minor?: number | null;
  percent_bps?: number | null;
  min_quantity?: number | null;
  min_purchase_minor?: number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  max_uses?: number | null;
  scope: DiscountScope;
  product_id?: string | null;
  priority?: number;
  active?: boolean;
}

export type UpdateDiscountInput = Partial<CreateDiscountInput>;

/**
 * Converts a human-readable rupee input (string or number) to integer minor paise.
 * Rejects negative amounts, non-numeric strings, or invalid numbers.
 * Examples:
 * - "100" -> 10000
 * - "100.50" -> 10050
 * - "0" -> 0
 */
export function rupeesToPaise(value: string | number): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Match non-negative number up to 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

/**
 * Converts integer minor paise to formatted or plain rupee string.
 * Examples:
 * - 10000 -> "100" or "₹100.00"
 * - 10050 -> "100.5" or "₹100.50"
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

/**
 * Converts a human-readable percentage input string/number to integer basis points.
 * Validates range 0 <= bps <= 10000 (0% to 100%).
 * Returns null if invalid or out of range.
 * Examples:
 * - "15" -> 1500
 * - "10.5" -> 1050
 * - "0" -> 0
 */
export function percentToBps(value: string | number): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 100) return null;
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100);
}

/**
 * Converts integer basis points to human-readable percentage display string.
 * Examples:
 * - 1500 -> "15%"
 * - 1050 -> "10.5%"
 */
export function bpsToPercent(bps: number, formatted = false): string {
  if (!Number.isSafeInteger(bps) || bps < 0) return formatted ? '0%' : '0';
  const val = bps / 100;
  const str = Number.isInteger(val) ? val.toString() : val.toString();
  return formatted ? `${str}%` : str;
}
