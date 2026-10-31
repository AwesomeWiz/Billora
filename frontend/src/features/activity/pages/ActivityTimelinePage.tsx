import React from 'react';
import { PageHeader, Button, EmptyState } from '../../../components/ui';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { ActivityFilters } from '../components/ActivityFilters';
import { ActivityFeed } from '../components/ActivityFeed';

export const ActivityTimelinePage: React.FC = () => {
  const {
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
  } = useActivityFeed();

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Timeline"
        description="Comprehensive audit trail of subscription, quotation, invoice, and lifecycle events."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
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
                Activity records are not yet accessible from the backend. The `/api/activity` endpoint is
                pending implementation or route registration in FastAPI. The interface is active and will
                reflect live operational audit logs once the backend service is mounted.
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

      {/* Filters */}
      <ActivityFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={loading || isEndpointUnavailable}
      />

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading system activity logs...</p>
        </div>
      ) : isEndpointUnavailable ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">
            Awaiting backend `/api/activity` audit service mount.
          </p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No activity events recorded"
          description="There are no audit events matching the selected filters or time range."
          action={
            <Button type="button" variant="secondary" onClick={resetFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <ActivityFeed items={items} />

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">
              Showing page <span className="font-medium text-gray-700">{page}</span> of{' '}
              <span className="font-medium text-gray-700">{totalPages}</span> ({total} events)
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

