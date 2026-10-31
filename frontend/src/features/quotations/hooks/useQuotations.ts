import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../../../lib/api/client';
import { quotationService } from '../services/quotationService';
import type { Quotation, QuotationListParams } from '../types';

export function useQuotations(initialParams?: QuotationListParams) {
  const [params, setParams] = useState<QuotationListParams>(initialParams || { page: 1, page_size: 10 });
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);

  // Track active fetch requests to avoid race conditions
  const activeFetchIdRef = useRef(0);

  const fetchQuotations = useCallback(async (currentParams: QuotationListParams) => {
    const fetchId = ++activeFetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await quotationService.listQuotations(currentParams);
      if (fetchId === activeFetchIdRef.current) {
        setQuotations(response.items);
        setTotal(response.total);
        setHasNext(response.has_next);
        setIsEndpointUnavailable(false);
      }
    } catch (err) {
      if (fetchId === activeFetchIdRef.current) {
        if (err instanceof ApiError && err.status === 404) {
          setIsEndpointUnavailable(true);
          setError('The quotations API endpoint is not yet mounted in the backend. Quotation operations may be unavailable until the backend module is mounted.');
        } else if (err instanceof ApiError) {
          setError(err.message || 'Failed to load quotations.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while loading quotations.');
        }
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchQuotations(params);
  }, [fetchQuotations, params]);

  const updateFilters = useCallback((newParams: Partial<QuotationListParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
      // Reset to page 1 if changing search, status, or date range
      page: newParams.page !== undefined ? newParams.page : 1,
    }));
  }, []);

  const refresh = useCallback(() => {
    fetchQuotations(params);
  }, [fetchQuotations, params]);

  return {
    quotations,
    total,
    hasNext,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    updateFilters,
    refresh,
  };
}

