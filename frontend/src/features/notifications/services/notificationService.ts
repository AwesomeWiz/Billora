import { api, ApiError } from '../../../lib/api/client';
import type { NotificationResponse, NotificationFilterParams, NotificationItem } from '../types';

export const notificationService = {
  async getNotifications(params: NotificationFilterParams = {}): Promise<NotificationResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.category) query.set('category', params.category);
    if (params.unread_only) query.set('unread_only', 'true');

    const queryString = query.toString();
    const endpoint = queryString ? `/notifications?${queryString}` : '/notifications';

    const data = await api.get<NotificationResponse | NotificationItem[]>(endpoint);

    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        unread_count: data.filter((n) => !n.is_read).length,
        page: 1,
        page_size: data.length || 20,
        has_next: false,
      };
    }

    if (data && Array.isArray((data as NotificationResponse).items)) {
      return data as NotificationResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid notifications response format returned from API.');
  },

  async markAsRead(id: string): Promise<void> {
    await api.post(`/notifications/${encodeURIComponent(id)}/read`, {});
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all', {});
  },
};

