import { api } from '../../lib/api';
import { billingIntervals, parseSubscription, type BillingInterval, type Subscription } from './api';
import { identifier, invalidRecord, minor, record, text } from '../customer/records';

export interface AgreedLine { id: string; product_id: string; variant_id?: string; description: string; quantity: number; unit_price_minor: number; billable?: boolean }
export interface SubscriptionDetail extends Subscription { lines?: AgreedLine[] }
export interface SubscriptionPlan {
  id: string; name: string; billing_interval: BillingInterval;
  active?: boolean; can_pause?: boolean; can_renew?: boolean; can_close_early?: boolean;
}
function optionalBoolean(value: unknown): boolean | undefined { return value == null ? undefined : typeof value === 'boolean' ? value : invalidRecord(); }
export function parseSubscriptionDetail(value: unknown): SubscriptionDetail {
  const body = record(value);
  const subscription = parseSubscription(body);
  let lines: AgreedLine[] | undefined;
  if (body.lines != null) {
    if (!Array.isArray(body.lines)) return invalidRecord();
    lines = body.lines.map(item => {
      const line = record(item);
      const quantity = minor(line.quantity);
      if (quantity < 1) return invalidRecord();
      return { id: identifier(line.id), product_id: identifier(line.product_id), variant_id: line.variant_id == null ? undefined : identifier(line.variant_id),
        description: text(line.description), quantity, unit_price_minor: minor(line.unit_price_minor), billable: optionalBoolean(line.billable) };
    });
  }
  return { ...subscription, lines };
}
export function parsePlan(value: unknown): SubscriptionPlan {
  const body = record(value);
  if (!billingIntervals.includes(body.billing_interval as BillingInterval)) return invalidRecord();
  return { id: identifier(body.id), name: text(body.name), billing_interval: body.billing_interval as BillingInterval,
    active: optionalBoolean(body.active), can_pause: optionalBoolean(body.can_pause), can_renew: optionalBoolean(body.can_renew), can_close_early: optionalBoolean(body.can_close_early) };
}
export const subscriptionDetailApi = {
  async detail(id: string, signal?: AbortSignal) { return parseSubscriptionDetail(await api.get<unknown>(`/subscriptions/${identifier(id)}`, { signal })); },
  async plan(id: string, signal?: AbortSignal) { return parsePlan(await api.get<unknown>(`/plans/${identifier(id)}`, { signal })); },
};
