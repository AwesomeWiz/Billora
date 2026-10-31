import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '../../../lib/api/client';
import { notificationService } from '../services/notificationService';
import type { NotificationItem, NotificationFilterParams } from '../types';

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEndpointUnavailable, setIsEndpointUnavailable] = useState(false);
  const [filters, setFilters] = useState<NotificationFilterParams>({
    category: '',
    unread_only: false,
  });

  const activeFetchIdRef = useRef(0);

  const fetchNotifications = useCallback(async (targetPage = 1, isManual = false) => {
    const fetchId = ++activeFetchIdRef.current;
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await notificationService.getNotifications({
        ...filters,
        page: targetPage,
        page_size: pageSize,
      });

      if (fetchId === activeFetchIdRef.current) {
        setItems(response.items || []);
        setTotal(response.total ?? (response.items?.length || 0));
        setUnreadCount(response.unread_count ?? (response.items?.filter((n) => !n.is_read).length || 0));
        setPage(response.page ?? targetPage);
        setHasNext(response.has_next ?? false);
        setIsEndpointUnavailable(false);
      }
    } catch (err: unknown) {
      if (fetchId === activeFetchIdRef.current) {
        if (err instanceof ApiError && err.status === 404) {
          setIsEndpointUnavailable(true);
          setError('The notifications endpoint (/api/notifications) is pending implementation in the backend.');
        } else if (err instanceof ApiError && err.status === 403) {
          setError('You do not have permission to view notifications.');
        } else if (err instanceof ApiError) {
          setError(err.message || 'Failed to fetch notifications.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred while loading notifications.');
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
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  const refresh = useCallback(() => {
    if (refreshing) return;
    fetchNotifications(page, true);
  }, [fetchNotifications, page, refreshing]);

  const markAsRead = useCallback(async (id: string) => {
    if (markingId) return;
    setMarkingId(id);
    try {
      await notificationService.markAsRead(id);
      // Refetch authoritative backend state rather than simulating persistence
      await fetchNotifications(page, false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update notification state on the server.');
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setMarkingId(null);
    }
  }, [fetchNotifications, markingId, page]);

  const markAllAsRead = useCallback(async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      // Refetch authoritative backend state rather than simulating persistence
      await fetchNotifications(page, false);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to mark all notifications as read on the server.');
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setMarkingAll(false);
    }
  }, [fetchNotifications, markingAll, page]);

  const updateFilters = useCallback((updates: Partial<NotificationFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ category: '', unread_only: false });
    setPage(1);
  }, []);

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1) return;
    fetchNotifications(newPage, false);
  }, [fetchNotifications]);

  return {
    items,
    total,
    unreadCount,
    page,
    pageSize,
    hasNext,
    loading,
    refreshing,
    markingId,
    markingAll,
    error,
    isEndpointUnavailable,
    filters,
    updateFilters,
    resetFilters,
    refresh,
    markAsRead,
    markAllAsRead,
    goToPage,
  };
}

