import { api, ApiError } from '../../../../lib/api/client';
import type {
  DiscountRule,
  DiscountListParams,
  DiscountListResponse,
  CreateDiscountInput,
  UpdateDiscountInput,
} from '../types';

function buildQuery(params?: DiscountListParams): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  if (params.page !== undefined && params.page > 0) {
    searchParams.set('page', String(params.page));
  }
  if (params.page_size !== undefined && params.page_size > 0) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }
  if (params.kind?.trim()) {
    searchParams.set('kind', params.kind.trim());
  }
  if (params.scope?.trim()) {
    searchParams.set('scope', params.scope.trim());
  }
  if (params.active !== undefined && params.active !== '') {
    searchParams.set('active', params.active);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const discountService = {
  async listDiscounts(params?: DiscountListParams): Promise<DiscountListResponse> {
    const query = buildQuery(params);
    const data = await api.get<DiscountListResponse | DiscountRule[]>(`/discounts${query}`);

    // Normalize both paginated object responses and raw array lists
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        page: 1,
        page_size: data.length,
        has_next: false,
      };
    }

    if (data && Array.isArray((data as DiscountListResponse).items)) {
      return data as DiscountListResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid discount list format returned from API.');
  },

  async getDiscount(id: string): Promise<DiscountRule> {
    return api.get<DiscountRule>(`/discounts/${encodeURIComponent(id)}`);
  },

  async createDiscount(input: CreateDiscountInput): Promise<DiscountRule> {
    return api.post<DiscountRule>('/discounts', input);
  },

  async updateDiscount(id: string, input: UpdateDiscountInput): Promise<DiscountRule> {
    return api.request<DiscountRule>(`/discounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    });
  },

  async toggleActive(id: string, active: boolean): Promise<DiscountRule> {
    return api.request<DiscountRule>(`/discounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { active },
    });
  },
};
