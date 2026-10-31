import { api, ApiError } from '../../../lib/api/client';
import type {
  Quotation,
  QuotationListParams,
  QuotationListResponse,
  CreateQuotationInput,
} from '../types';

function buildQuery(params?: QuotationListParams): string {
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
  if (params.status) {
    searchParams.set('status', params.status);
  }
  if (params.account_id?.trim()) {
    searchParams.set('account_id', params.account_id.trim());
  }
  if (params.subscription_id?.trim()) {
    searchParams.set('subscription_id', params.subscription_id.trim());
  }
  if (params.from_date?.trim()) {
    searchParams.set('from_date', params.from_date.trim());
  }
  if (params.to_date?.trim()) {
    searchParams.set('to_date', params.to_date.trim());
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const quotationService = {
  async listQuotations(params?: QuotationListParams): Promise<QuotationListResponse> {
    const query = buildQuery(params);
    const data = await api.get<QuotationListResponse | Quotation[]>(
      `/quotations${query}`
    );

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

    if (data && Array.isArray((data as QuotationListResponse).items)) {
      return data as QuotationListResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid quotation list format returned from API.');
  },

  async getQuotation(id: string): Promise<Quotation> {
    return api.get<Quotation>(`/quotations/${encodeURIComponent(id)}`);
  },

  async createQuotation(input: CreateQuotationInput): Promise<Quotation> {
    return api.post<Quotation>('/quotations', input);
  },

  async confirmQuotation(id: string): Promise<Quotation> {
    return api.post<Quotation>(`/quotations/${encodeURIComponent(id)}/confirm`);
  },
};

