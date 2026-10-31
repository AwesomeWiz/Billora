import React from 'react';
import type { ActivityFilterParams } from '../types';

interface ActivityFiltersProps {
  filters: ActivityFilterParams;
  onChange: (updates: Partial<ActivityFilterParams>) => void;
  onReset: () => void;
  disabled?: boolean;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  filters,
  onChange,
  onReset,
  disabled = false,
}) => {
  const hasActiveFilters = Boolean(
    filters.search || filters.event_type || filters.entity_type || filters.from_date || filters.to_date
  );

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div>
          <label htmlFor="activity-search" className="block text-xs font-medium text-gray-700 mb-1">
            Search Events
          </label>
          <input
            id="activity-search"
            type="text"
            className="w-full text-sm rounded-md border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search description, entity..."
            value={filters.search || ''}
            onChange={(e) => onChange({ search: e.target.value })}
            disabled={disabled}
          />
        </div>

        {/* Entity Type Filter */}
        <div>
          <label htmlFor="activity-entity-type" className="block text-xs font-medium text-gray-700 mb-1">
            Entity Type
          </label>
          <select
            id="activity-entity-type"
            className="w-full text-sm rounded-md border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            value={filters.entity_type || ''}
            onChange={(e) => onChange({ entity_type: e.target.value })}
            disabled={disabled}
          >
            <option value="">All Entities</option>
            <option value="customer">Customer</option>
            <option value="subscription">Subscription</option>
            <option value="quotation">Quotation</option>
            <option value="invoice">Invoice</option>
            <option value="payment">Payment</option>
            <option value="plan">Plan</option>
            <option value="product">Product</option>
          </select>
        </div>

        {/* Event Type Filter */}
        <div>
          <label htmlFor="activity-event-type" className="block text-xs font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            id="activity-event-type"
            className="w-full text-sm rounded-md border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            value={filters.event_type || ''}
            onChange={(e) => onChange({ event_type: e.target.value })}
            disabled={disabled}
          >
            <option value="">All Events</option>
            <option value="CUSTOMER_CREATED">Customer Created</option>
            <option value="SUBSCRIPTION_ACTIVATED">Subscription Activated</option>
            <option value="SUBSCRIPTION_CANCELLED">Subscription Cancelled</option>
            <option value="QUOTATION_CREATED">Quotation Created</option>
            <option value="QUOTATION_CONFIRMED">Quotation Confirmed</option>
            <option value="INVOICE_GENERATED">Invoice Generated</option>
            <option value="INVOICE_PAID">Invoice Paid</option>
            <option value="PAYMENT_RECORDED">Payment Recorded</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label htmlFor="activity-from-date" className="block text-xs font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            id="activity-from-date"
            type="date"
            className="w-full text-sm rounded-md border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            value={filters.from_date || ''}
            onChange={(e) => onChange({ from_date: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            onClick={onReset}
            disabled={disabled}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

