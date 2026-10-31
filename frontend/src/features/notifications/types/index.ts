export type NotificationCategory =
  | 'BILLING'
  | 'SUBSCRIPTION'
  | 'QUOTATION'
  | 'PAYMENT'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  created_at: string; // ISO 8601
  category: NotificationCategory | string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  entity_type?: 'invoice' | 'subscription' | 'quotation' | 'customer' | 'system' | string;
  entity_id?: string;
}

export interface NotificationFilterParams {
  category?: string;
  unread_only?: boolean;
  page?: number;
  page_size?: number;
}

export interface NotificationResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

