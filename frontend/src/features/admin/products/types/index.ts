/**
 * Products & Variants domain types.
 * Aligned with ARCHITECTURE.md §4.2 (data model) and §7.3 (API fixtures).
 * Money fields are always integer minor units (paise for INR).
 */

export const PRODUCT_TYPES = ['SOFTWARE', 'SERVICE', 'HARDWARE', 'OTHER'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  SOFTWARE: 'Software',
  SERVICE: 'Service',
  HARDWARE: 'Hardware',
  OTHER: 'Other',
};

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  /** Sales price in minor units (paise). e.g. 150000 = ₹1,500.00 */
  sales_price_minor: number;
  /** Cost price in minor units (paise). */
  cost_price_minor: number;
  currency: string;
  notes?: string | null;
  active: boolean;
  /** Number of configured variants (may be absent in list responses). */
  variant_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attribute_name: string;
  attribute_value: string;
  /** Signed price delta in minor units. e.g. +56000 = +₹560.00 */
  price_delta_minor: number;
  active: boolean;
  created_at?: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ProductListParams {
  page?: number;
  page_size?: number;
  /** Server-side name search */
  search?: string;
  /** Filter by ProductType, or empty string for all */
  type?: string;
  /** 'true' | 'false' | '' for all */
  active?: string;
}

export interface CreateProductInput {
  name: string;
  type: ProductType;
  sales_price_minor: number;
  cost_price_minor: number;
  currency?: string;
  notes?: string;
  active?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput> & { active?: boolean };

export interface CreateVariantInput {
  attribute_name: string;
  attribute_value: string;
  /** Signed price adjustment in minor units. */
  price_delta_minor: number;
  active?: boolean;
}

export type UpdateVariantInput = Partial<CreateVariantInput> & { active?: boolean };

export interface ResolvedVariantPrice {
  basePriceMinor: number;
  deltaMinor: number;
  resolvedPriceMinor: number;
  currency: string;
}

/**
 * Calculates resolved unit price given base sales price and variant delta.
 * Both values must be integer minor units (paise).
 */
export function calculateResolvedPrice(baseSalesPriceMinor: number, priceDeltaMinor: number): number {
  return Math.max(0, baseSalesPriceMinor + priceDeltaMinor);
}

/**
 * Converts a rupee input string to integer paise.
 * Returns null if the string is empty or invalid.
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
 * Converts a signed rupee input string (e.g. "+560", "-50", "560") to integer paise.
 * Returns null if the string is empty or invalid.
 */
export function rupeeDeltaToPaise(value: string | number): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[+-]?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const parsed = parseFloat(trimmed);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

/**
 * Converts integer paise to rupee string with 2 decimal places.
 */
export function paiseToRupees(paise: number): string {
  if (!Number.isSafeInteger(paise)) return '0.00';
  return (paise / 100).toFixed(2);
}
