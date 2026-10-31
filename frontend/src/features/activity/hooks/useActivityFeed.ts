import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../../../lib/api/client';
import { activityService } from '../services/activityService';
import type { ActivityItem, ActivityFilterParams } from '../types';

export function useActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [filters, setFilters] = useState<ActivityFilterParams>({
    event_type: '',
    entity_type: '',
    search: '',
    from_date: '',
    to_date: '',
  });

  const activeFetchIdRef = useRef(0);

  const fetchActivity = useCallback(async (targetPage = 1, isManual = false) => {
    const fetchId = ++activeFetchIdRef.current;
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await activityService.getActivityFeed({
        ...filters,
        page: targetPage,
        page_size: pageSize,
      });

      if (fetchId === activeFetchIdRef.current) {
        setItems(response.items || []);
        setTotal(response.total ?? (response.items?.length || 0));
        setPage(response.page ?? targetPage);
        setHasNext(response.has_next ?? false);
        setIsEndpointUnavailable(false);
      }
    } catch (err: unknown) {
      if (fetchId === activeFetchIdRef.current) {
        if (err instanceof ApiError && err.status === 404) {
          setIsEndpointUnavailable(true);
          setError('The activity feed endpoint (/api/activity) is pending implementation in the backend.');
        } else if (err instanceof ApiError && err.status === 403) {
          setError('You do not have administrative permission to view system activity.');
        } else if (err instanceof ApiError) {
          setError(err.message || 'Failed to fetch activity records.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while loading activity records.');
        }
      }
    } finally {
      if (fetchId === activeFetchIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filters, pageSize]);

  useEffect(() => {
    fetchActivity(1, false);
  }, [fetchActivity]);

  const refresh = useCallback(() => {
    if (refreshing) return;
    fetchActivity(page, true);
  }, [fetchActivity, page, refreshing]);

  const updateFilters = useCallback((updates: Partial<ActivityFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ event_type: '', entity_type: '', search: '', from_date: '', to_date: '' });
    setPage(1);
  }, []);

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1) return;
    fetchActivity(newPage, false);
  }, [fetchActivity]);

  return {
    items,
    total,
    page,
    pageSize,
    hasNext,
    loading,
    refreshing,
    error,
    isEndpointUnavailable,
    filters,
    updateFilters,
    resetFilters,
    refresh,
    goToPage,
  };
}

