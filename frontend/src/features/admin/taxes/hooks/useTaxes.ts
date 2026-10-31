import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError, errorMessage } from '../../../../lib/api/client';
import { taxService } from '../services/taxService';
import type { TaxRule, TaxListParams } from '../types';

export interface UseTaxesResult {
  taxes: TaxRule[];
  total: number;
  loading: boolean;
  error: string | null;
  isEndpointUnavailable: boolean;
  params: TaxListParams;
  setParams: (updater: TaxListParams | ((prev: TaxListParams) => TaxListParams)) => void;
  refresh: () => Promise<void>;
}

export function useTaxes(initialParams: TaxListParams = {}): UseTaxesResult {
  const [params, setParams] = useState<TaxListParams>(initialParams);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const mountedRef = useRef(true);

  const fetchTaxes = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const response = await taxService.listTaxes(params);
      if (!mountedRef.current) return;
      setTaxes(response.items);
      setTotal(response.total);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof ApiError && (err.status === 404 || err.status === 0 || err.code === 'HTTP_404')) {
        setIsEndpointUnavailable(true);
        setError('The taxes backend endpoint (/api/taxes) is not yet available.');
      } else {
        setError(errorMessage(err));
      }
      setTaxes([]);
      setTotal(0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchTaxes();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchTaxes]);

  return {
    taxes,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh: fetchTaxes,
  };
}
