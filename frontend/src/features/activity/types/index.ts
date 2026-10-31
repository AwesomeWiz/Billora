export type ActivityEventType =
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'QUOTATION_CREATED'
  | 'QUOTATION_CONFIRMED'
  | 'QUOTATION_EXPIRED'
  | 'INVOICE_GENERATED'
  | 'INVOICE_SENT'
  | 'INVOICE_PAID'
  | 'INVOICE_VOIDED'
  | 'PAYMENT_RECORDED'
  | 'PLAN_CREATED'
  | 'PRODUCT_CREATED'
  | 'TAX_CREATED'
  | 'DISCOUNT_CREATED';

export type ActivityEntityType =
  | 'customer'
  | 'subscription'
  | 'quotation'
  | 'invoice'
  | 'payment'
  | 'plan'
  | 'product'
  | 'tax'
  | 'discount'
  | 'system';

export interface ActivityActor {
  id: string;
  name?: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'SYSTEM';
}

export interface ActivityItem {
  id: string;
  timestamp: string; // ISO 8601
  actor: ActivityActor;
  event_type: ActivityEventType | string;
  entity_type: ActivityEntityType | string;
  entity_id?: string;
  entity_label?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilterParams {
  event_type?: string;
  entity_type?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface ActivityResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export const ACTIVITY_EVENT_LABELS: Record<string, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  CUSTOMER_CREATED: { label: 'Customer Created', tone: 'info' },
  CUSTOMER_UPDATED: { label: 'Customer Updated', tone: 'neutral' },
  SUBSCRIPTION_CREATED: { label: 'Subscription Drafted', tone: 'neutral' },
  SUBSCRIPTION_ACTIVATED: { label: 'Subscription Activated', tone: 'success' },
  SUBSCRIPTION_CANCELLED: { label: 'Subscription Cancelled', tone: 'danger' },
  QUOTATION_CREATED: { label: 'Quotation Created', tone: 'info' },
  QUOTATION_CONFIRMED: { label: 'Quotation Confirmed', tone: 'success' },
  QUOTATION_EXPIRED: { label: 'Quotation Expired', tone: 'warning' },
  INVOICE_GENERATED: { label: 'Invoice Generated', tone: 'info' },
  INVOICE_SENT: { label: 'Invoice Sent', tone: 'neutral' },
  INVOICE_PAID: { label: 'Invoice Paid', tone: 'success' },
  INVOICE_VOIDED: { label: 'Invoice Voided', tone: 'danger' },
  PAYMENT_RECORDED: { label: 'Payment Recorded', tone: 'success' },
  PLAN_CREATED: { label: 'Plan Created', tone: 'info' },
  PRODUCT_CREATED: { label: 'Product Created', tone: 'info' },
  TAX_CREATED: { label: 'Tax Created', tone: 'neutral' },
  DISCOUNT_CREATED: { label: 'Discount Created', tone: 'neutral' },
};

