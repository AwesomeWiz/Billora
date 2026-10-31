import React from 'react';
import { PageHeader, Button, EmptyState } from '../../../components/ui';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationList } from '../components/NotificationList';

export const NotificationsPage: React.FC = () => {
  const {
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
  } = useNotifications();

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="System events, billing status updates, and operational notifications."
        action={
          <div className="flex gap-2">
            {unreadCount > 0 && !isEndpointUnavailable && (
              <Button
                type="button"
                variant="secondary"
                onClick={markAllAsRead}
                disabled={loading || markingAll || refreshing}
              >
                {markingAll ? 'Marking all read...' : 'Mark all as read'}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={refresh}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* Backend 404 Notice Banner */}
      {isEndpointUnavailable && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r text-amber-900 shadow-sm"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">Backend Endpoint Notice</h4>
              <p className="mt-1 text-xs text-amber-700">
                The notifications endpoint (`/api/notifications`) is not yet available in the backend.
                Notification records and read confirmations require backend persistence. The user interface
                is verified and ready for connection as soon as the service is mounted.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={refresh}
              disabled={refreshing}
              className="ml-4 text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* General Error Notice */}
      {error && !isEndpointUnavailable && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center justify-between"
        >
          <div className="text-sm">
            <span className="font-semibold">Error: </span>
            {error}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={refresh}
            disabled={refreshing}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="text-sm rounded-md border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            value={filters.category || ''}
            onChange={(e) => updateFilters({ category: e.target.value })}
            disabled={loading || isEndpointUnavailable}
          >
            <option value="">All Categories</option>
            <option value="BILLING">Billing</option>
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="QUOTATION">Quotation</option>
            <option value="PAYMENT">Payment</option>
            <option value="SYSTEM">System</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters.unread_only || false}
              onChange={(e) => updateFilters({ unread_only: e.target.checked })}
              disabled={loading || isEndpointUnavailable}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show unread only
          </label>
        </div>

        {(filters.category || filters.unread_only) && (
          <button
            type="button"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            onClick={resetFilters}
            disabled={loading || isEndpointUnavailable}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
        </div>
      ) : isEndpointUnavailable ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">
            Awaiting backend `/api/notifications` service mount.
          </p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={
            filters.unread_only
              ? 'You have caught up with all notifications.'
              : 'There are no notifications matching the selected filter.'
          }
          action={
            (filters.category || filters.unread_only) ? (
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <NotificationList
            items={items}
            onMarkAsRead={markAsRead}
            markingId={markingId}
          />

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">
              Showing page <span className="font-medium text-gray-700">{page}</span> of{' '}
              <span className="font-medium text-gray-700">{totalPages}</span> ({total} notifications)
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="text-xs py-1 px-2.5"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => goToPage(page + 1)}
                disabled={!hasNext && page >= totalPages}
                className="text-xs py-1 px-2.5"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

