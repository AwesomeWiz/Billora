import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError, errorMessage } from '../../../../lib/api/client';
import { planService } from '../services/planService';
import type { Plan, PlanListParams } from '../types';

export interface UsePlansResult {
  plans: Plan[];
  total: number;
  loading: boolean;
  error: string | null;
  isEndpointUnavailable: boolean;
  params: PlanListParams;
  setParams: (updater: PlanListParams | ((prev: PlanListParams) => PlanListParams)) => void;
  refresh: () => Promise<void>;
}

export function usePlans(initialParams: PlanListParams = {}): UsePlansResult {
  const [params, setParams] = useState<PlanListParams>(initialParams);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const mountedRef = useRef(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsEndpointUnavailable(false);

    try {
      const response = await planService.listPlans(params);
      if (!mountedRef.current) return;
      setPlans(response.items);
      setTotal(response.total);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof ApiError && (err.status === 404 || err.status === 0 || err.code === 'HTTP_404')) {
        setIsEndpointUnavailable(true);
        setError('The subscription plans backend endpoint (/api/plans) is not yet available.');
      } else {
        setError(errorMessage(err));
      }
      setPlans([]);
      setTotal(0);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchPlans();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchPlans]);

  return {
    plans,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh: fetchPlans,
  };
}
