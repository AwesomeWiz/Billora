import { useState, useEffect, useCallback, useRef } from 'react';
import { quotationTemplateService } from '../services/quotationTemplateService';
import type { QuotationTemplate, QuotationTemplateListParams } from '../types';
import { ApiError } from '../../../lib/api/client';

export function useQuotationTemplates(initialParams?: QuotationTemplateListParams) {
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [params, setParams] = useState<QuotationTemplateListParams>(initialParams || {});

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const response = await quotationTemplateService.listTemplates(params);
      if (!controller.signal.aborted) {
        setTemplates(response.items || []);
        setTotal(response.total ?? (response.items ? response.items.length : 0));
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 404) {
        setIsEndpointUnavailable(true);
        setError(
          'The quotation templates endpoint (/api/quotation-templates) is not yet mounted on the backend.'
        );
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading quotation templates.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    fetchTemplates();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTemplates]);

  return {
    templates,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh: fetchTemplates,
  };
}
