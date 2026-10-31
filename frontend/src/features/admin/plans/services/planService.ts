import { api, ApiError } from '../../../../lib/api/client';
import type {
  Plan,
  PlanListParams,
  PlanListResponse,
  CreatePlanInput,
  UpdatePlanInput,
} from '../types';

function buildQuery(params?: PlanListParams): string {
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
  if (params.billing_interval?.trim()) {
    searchParams.set('billing_interval', params.billing_interval.trim());
  }
  if (params.active !== undefined && params.active !== '') {
    searchParams.set('active', params.active);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const planService = {
  async listPlans(params?: PlanListParams): Promise<PlanListResponse> {
    const query = buildQuery(params);
    const data = await api.get<PlanListResponse | Plan[]>(`/plans${query}`);

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

    if (data && Array.isArray((data as PlanListResponse).items)) {
      return data as PlanListResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid plan list format returned from API.');
  },

  async getPlan(id: string): Promise<Plan> {
    return api.get<Plan>(`/plans/${encodeURIComponent(id)}`);
  },

  async createPlan(input: CreatePlanInput): Promise<Plan> {
    return api.post<Plan>('/plans', input);
  },

  async updatePlan(id: string, input: UpdatePlanInput): Promise<Plan> {
    return api.request<Plan>(`/plans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
    });
  },
};
