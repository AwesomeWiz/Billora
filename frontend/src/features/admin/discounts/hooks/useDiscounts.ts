import { useState, useEffect, useCallback, useRef } from 'react';
import { discountService } from '../services/discountService';
import type { DiscountRule, DiscountListParams } from '../types';
import { ApiError } from '../../../../lib/api/client';

export function useDiscounts(initialParams?: DiscountListParams) {
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [params, setParams] = useState<DiscountListParams>(initialParams || {});

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDiscounts = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const response = await discountService.listDiscounts(params);
      if (!controller.signal.aborted) {
        setDiscounts(response.items || []);
        setTotal(response.total ?? (response.items ? response.items.length : 0));
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiError && err.status === 404) {
        setIsEndpointUnavailable(true);
        setError('The discounts service endpoint (/api/discounts) is not yet available on the backend.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while loading discounts.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    fetchDiscounts();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDiscounts]);

  return {
    discounts,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh: fetchDiscounts,
  };
}
