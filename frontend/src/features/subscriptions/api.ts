import { api } from '../../lib/api';
import { currency, date, identifier, invalidRecord, minor, parsePage, record, text } from '../customer/records';

export const subscriptionStatuses = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'] as const;
export type SubscriptionStatus = typeof subscriptionStatuses[number];
export const billingIntervals = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;
export type BillingInterval = typeof billingIntervals[number];
export interface Subscription {
  id: string; number: string; account_id: string; plan_id: string; status: SubscriptionStatus;
  currency: string; billing_interval?: BillingInterval; recurring_amount_minor?: number;
  start_date?: string; expiry_date?: string | null; next_billing_date: string | null; payment_term_days?: number;
}
/** Flat documented fields; optional list projections stay isolated here pending DTO freeze. */
export function parseSubscription(value: unknown): Subscription {
  const body = record(value);
  if (!subscriptionStatuses.includes(body.status as SubscriptionStatus)) return invalidRecord();
  if (body.billing_interval != null && !billingIntervals.includes(body.billing_interval as BillingInterval)) return invalidRecord();
  return {
    id: identifier(body.id), number: text(body.number), account_id: identifier(body.account_id), plan_id: identifier(body.plan_id),
    status: body.status as SubscriptionStatus, currency: currency(body.currency),
    billing_interval: body.billing_interval == null ? undefined : body.billing_interval as BillingInterval,
    recurring_amount_minor: body.recurring_amount_minor == null ? undefined : minor(body.recurring_amount_minor),
    start_date: body.start_date == null ? undefined : date(body.start_date),
    expiry_date: body.expiry_date == null ? null : date(body.expiry_date),
    next_billing_date: body.next_billing_date == null ? null : date(body.next_billing_date),
    payment_term_days: body.payment_term_days == null ? undefined : minor(body.payment_term_days),
  };
}

export const subscriptionApi = {
  async list(query: string, signal?: AbortSignal) { return parsePage(await api.get<unknown>(`/subscriptions?${query}`, { signal }), parseSubscription); },
};
