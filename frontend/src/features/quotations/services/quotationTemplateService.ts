import { api, ApiError } from '../../../lib/api/client';
import type {
  QuotationTemplate,
  QuotationTemplateListParams,
  QuotationTemplateListResponse,
  CreateQuotationTemplateInput,
} from '../types';

function buildQuery(params?: QuotationTemplateListParams): string {
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
  if (params.plan_id?.trim()) {
    searchParams.set('plan_id', params.plan_id.trim());
  }
  if (params.active !== undefined && params.active !== '') {
    searchParams.set('active', params.active);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const quotationTemplateService = {
  async listTemplates(params?: QuotationTemplateListParams): Promise<QuotationTemplateListResponse> {
    const query = buildQuery(params);
    const data = await api.get<QuotationTemplateListResponse | QuotationTemplate[]>(
      `/quotation-templates${query}`
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

    if (data && Array.isArray((data as QuotationTemplateListResponse).items)) {
      return data as QuotationTemplateListResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid quotation template list format returned from API.');
  },

  async getTemplate(id: string): Promise<QuotationTemplate> {
    return api.get<QuotationTemplate>(`/quotation-templates/${encodeURIComponent(id)}`);
  },

  async createTemplate(input: CreateQuotationTemplateInput): Promise<QuotationTemplate> {
    return api.post<QuotationTemplate>('/quotation-templates', input);
  },
};
