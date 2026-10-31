import { api, ApiError } from '../../../lib/api/client';
import type { ActivityResponse, ActivityFilterParams, ActivityItem } from '../types';

export const activityService = {
  async getActivityFeed(params: ActivityFilterParams = {}): Promise<ActivityResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.event_type) query.set('event_type', params.event_type);
    if (params.entity_type) query.set('entity_type', params.entity_type);
    if (params.search) query.set('search', params.search);
    if (params.from_date) query.set('from_date', params.from_date);
    if (params.to_date) query.set('to_date', params.to_date);

    const queryString = query.toString();
    const endpoint = queryString ? `/activity?${queryString}` : '/activity';

    const data = await api.get<ActivityResponse | ActivityItem[]>(endpoint);

    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        page_size: data.length || 20,
        has_next: false,
      };
    }

    if (data && Array.isArray((data as ActivityResponse).items)) {
      return data as ActivityResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid activity response format returned from API.');
  },
};

