import { api, ApiError } from '../../../lib/api/client';
import type { RevenueLeakFinding, RevenueLeakResponse } from '../types';

export const revenueRadarService = {
  async getRevenueLeaks(): Promise<RevenueLeakResponse> {
    const data = await api.get<RevenueLeakResponse | RevenueLeakFinding[]>('/alerts/revenue-leaks');

    // Normalize direct array responses or structured envelope
    if (Array.isArray(data)) {
      return {
        findings: data,
      };
    }

    if (data && Array.isArray((data as RevenueLeakResponse).findings)) {
      return data as RevenueLeakResponse;
    }

    throw new ApiError(500, 'INVALID_RESPONSE', 'Invalid revenue leaks response format returned from API.');
  },
};
