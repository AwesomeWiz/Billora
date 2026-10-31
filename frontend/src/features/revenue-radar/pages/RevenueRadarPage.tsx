import React from 'react';
import { PageHeader, Button, EmptyState } from '../../../components/ui';
import { useRevenueRadar } from '../hooks/useRevenueRadar';
import { LeakSummaryCards } from '../components/LeakSummaryCards';
import { LeakFilters } from '../components/LeakFilters';
import { LeakFindingsTable } from '../components/LeakFindingsTable';

export const RevenueRadarPage: React.FC = () => {
  const {
    findings,
    rawFindingsCount,
    summary,
    loading,
    refreshing,
    error,
    isEndpointUnavailable,
    filters,
    updateFilters,
    resetFilters,
    refresh,
  } = useRevenueRadar();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Revenue Leak Radar"
        description="Identifies actionable billing problems and discrepancies before revenue is missed."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={refresh}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing checks...' : 'Refresh checks'}
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
                Revenue Leak Radar data is not yet available from the backend. The `/api/alerts/revenue-leaks`
                endpoint is pending implementation or routing in FastAPI. The frontend interface and filtering rules
                are fully active and will reflect real computed alerts once the backend service is mounted.
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

      {/* Summary KPI Cards */}
      {!isEndpointUnavailable && (
        <LeakSummaryCards findings={findings} summary={summary} />
      )}

      {/* Filter Controls */}
      <LeakFilters
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        disabled={loading || isEndpointUnavailable}
      />

      {/* Main Content Findings Table / Loading / Empty */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Scanning billing cycles and invoices for revenue leaks...</p>
        </div>
      ) : isEndpointUnavailable ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-500">
            Awaiting backend `/api/alerts/revenue-leaks` service connection.
          </p>
        </div>
      ) : rawFindingsCount === 0 ? (
        <EmptyState
          title="No revenue risks detected"
          description="We haven't found overdue or missed-billing events for this filter."
        />
      ) : findings.length === 0 ? (
        <EmptyState
          title="No matching findings"
          description="No revenue risks match the currently selected filter criteria."
          action={
            <Button type="button" variant="secondary" onClick={resetFilters}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Showing <span className="font-semibold text-gray-800">{findings.length}</span> of{' '}
              <span className="font-semibold text-gray-800">{rawFindingsCount}</span> active detection findings
            </span>
            {refreshing && <span className="text-indigo-600 font-medium">Updating findings...</span>}
          </div>
          <LeakFindingsTable findings={findings} />
        </div>
      )}
    </div>
  );
};
