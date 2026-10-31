import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../../../lib/api/client';
import { revenueRadarService } from '../services/revenueRadarService';
import type { RevenueLeakFinding, RevenueLeakSummary, LeakRadarFilterParams } from '../types';

export function useRevenueRadar() {
  const [findings, setFindings] = useState<RevenueLeakFinding[]>([]);
  const [summary, setSummary] = useState<RevenueLeakSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [filters, setFilters] = useState<LeakRadarFilterParams>({
    severity: '',
    rule: '',
    search: '',
  });

  const activeFetchIdRef = useRef(0);

  const fetchLeaks = useCallback(async (isManualRefresh = false) => {
    const fetchId = ++activeFetchIdRef.current;
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await revenueRadarService.getRevenueLeaks();
      if (fetchId === activeFetchIdRef.current) {
        setFindings(response.findings || []);
        setSummary(response.summary || null);
        setIsEndpointUnavailable(false);
      }
    } catch (err: unknown) {
      if (fetchId === activeFetchIdRef.current) {
        if (err instanceof ApiError && err.status === 404) {
          setIsEndpointUnavailable(true);
          setError('The Revenue Leak Radar endpoint (/api/alerts/revenue-leaks) is not yet available in the backend.');
        } else if (err instanceof ApiError && err.status === 403) {
          setError('You do not have administrative permission to view revenue leak alerts.');
        } else if (err instanceof ApiError) {
          setError(err.message || 'Failed to fetch revenue leak radar findings.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while loading revenue leak findings.');
        }
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchLeaks(false);
  }, [fetchLeaks]);

  const refresh = useCallback(() => {
    if (refreshing) return;
    fetchLeaks(true);
  }, [fetchLeaks, refreshing]);

  const updateFilters = useCallback((updates: Partial<LeakRadarFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ severity: '', rule: '', search: '' });
  }, []);

  // Filter findings safely
  const filteredFindings = findings.filter((finding) => {
    if (filters.severity && finding.severity !== filters.severity) {
      return false;
    }
    if (filters.rule && finding.rule !== filters.rule) {
      return false;
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const titleMatch = finding.title.toLowerCase().includes(q);
      const explanationMatch = finding.explanation.toLowerCase().includes(q);
      const entityIdMatch = finding.entity_id.toLowerCase().includes(q);
      const customerMatch = finding.customer_name?.toLowerCase().includes(q) ?? false;
      const keyMatch = finding.finding_key.toLowerCase().includes(q);
      if (!titleMatch && !explanationMatch && !entityIdMatch && !customerMatch && !keyMatch) {
        return false;
      }
    }
    return true;
  });

  return {
    findings: filteredFindings,
    rawFindingsCount: findings.length,
    summary,
    loading,
    refreshing,
    error,
    isEndpointUnavailable,
    filters,
    updateFilters,
    resetFilters,
    refresh,
  };
}
