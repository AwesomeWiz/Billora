/**
 * Subscription Plans domain types and contracts.
 * Aligned with ARCHITECTURE.md §4.2, PRD §4.3 and API conventions.
 * All monetary amounts are integers in minor units (paise for INR).
 */

export const BILLING_INTERVALS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

export interface PlanLifecyclePolicies {
  /** Subscriptions under this plan automatically transition to CLOSED on expiry date */
  auto_close: boolean;
  /** Customers or staff can terminate active subscriptions before natural term end */
  can_close_early: boolean;
  /** Subscriptions under this plan may be temporarily paused */
  can_pause: boolean;
  /** Subscriptions can be renewed for another billing cycle upon expiry */
  can_renew: boolean;
}

export interface Plan extends PlanLifecyclePolicies {
  id: string;
  name: string;
  /** Base plan fee in minor units (paise). e.g. 150000 = ₹1,500.00 */
  base_fee_minor: number;
  /**
   * When true, base_fee_minor is an explicit recurring charge on invoices.
   * When false, base fee is informational/display-only and invoices charge only itemized products.
   */
  bill_plan_base_fee: boolean;
  billing_interval: BillingInterval;
  /** Minimum unit quantity required for subscriptions under this plan (>= 1) */
  min_quantity: number;
  /** ISO date YYYY-MM-DD or ISO timestamp from which plan can be subscribed */
  available_from: string;
  /** Optional ISO date YYYY-MM-DD or timestamp until which plan is available */
  available_to?: string | null;
  currency: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlanListParams {
  search?: string;
  billing_interval?: string;
  active?: string;
  page?: number;
  page_size?: number;
}

export interface PlanListResponse {
  items: Plan[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface CreatePlanInput extends PlanLifecyclePolicies {
  name: string;
  base_fee_minor: number;
  bill_plan_base_fee: boolean;
  billing_interval: BillingInterval;
  min_quantity: number;
  available_from: string;
  available_to?: string | null;
  currency?: string;
  active?: boolean;
}

export type UpdatePlanInput = Partial<CreatePlanInput>;
