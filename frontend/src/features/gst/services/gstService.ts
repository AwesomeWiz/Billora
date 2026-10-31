import { api, ApiError } from '../../../lib/api/client';
import type { GstSettings, GstIntelligenceSummary, GstTaxError } from '../types';

export const gstService = {
  async getSettings(): Promise<GstSettings> {
    try {
      return await api.get<GstSettings>('/gst/settings');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(404, 'NOT_FOUND', 'GST Settings service (/api/gst/settings) is pending implementation in the backend.');
      }
      throw err;
    }
  },

  async updateSettings(settings: Partial<GstSettings>): Promise<GstSettings> {
    return await api.request<GstSettings>('/gst/settings', {
      method: 'PATCH',
      body: settings,
    });
  },

  async getIntelligenceSummary(): Promise<GstIntelligenceSummary> {
    try {
      return await api.get<GstIntelligenceSummary>('/gst/intelligence');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(404, 'NOT_FOUND', 'GST Intelligence service (/api/gst/intelligence) is pending implementation in the backend.');
      }
      throw err;
    }
  },

  async getTaxErrors(): Promise<GstTaxError[]> {
    try {
      const data = await api.get<GstTaxError[] | { items: GstTaxError[] }>('/gst/errors');
      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as { items: GstTaxError[] }).items)) {
        return (data as { items: GstTaxError[] }).items;
      }
      return [];
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        throw new ApiError(404, 'NOT_FOUND', 'GST Tax Error Review service (/api/gst/errors) is pending implementation in the backend.');
      }
      throw err;
    }
  },

  async approveTaxFix(errorId: string): Promise<void> {
    await api.post(`/gst/errors/${encodeURIComponent(errorId)}/approve`, {});
  },
};
