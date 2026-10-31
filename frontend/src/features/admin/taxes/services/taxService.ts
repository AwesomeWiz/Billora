import { api, ApiError } from '../../../../lib/api/client';
import type {
  TaxRule,
  TaxListParams,
  TaxListResponse,
  CreateTaxInput,
  UpdateTaxInput,
} from '../types';

function buildQuery(params?: TaxListParams): string {
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
  if (params.scope?.trim()) {
    searchParams.set('scope', params.scope.trim());
  }
  if (params.active !== undefined && params.active !== '') {
    searchParams.set('active', params.active);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const taxService = {
  async listTaxes(params?: TaxListParams): Promise<TaxListResponse> {
    const query = buildQuery(params);
    const data = await api.get<TaxListResponse | TaxRule[]>(`/taxes${query}`);

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

    if (data && Array.isArray((data as TaxListResponse).items)) {
      return data as TaxListResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid tax list format returned from API.');
  },

  async getTax(id: string): Promise<TaxRule> {
    return api.get<TaxRule>(`/taxes/${encodeURIComponent(id)}`);
  },

  async createTax(input: CreateTaxInput): Promise<TaxRule> {
    return api.post<TaxRule>('/taxes', input);
  },

  async updateTax(id: string, input: UpdateTaxInput): Promise<TaxRule> {
    return api.request<TaxRule>(`/taxes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    });
  },

  async toggleActive(id: string, active: boolean): Promise<TaxRule> {
    return api.request<TaxRule>(`/taxes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { active },
    });
  },
};
