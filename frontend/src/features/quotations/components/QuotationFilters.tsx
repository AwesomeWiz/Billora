import React from 'react';
import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../components/ui';
import type { QuotationListParams, QuotationStatus } from '../types';

interface QuotationFiltersProps {
  filters: QuotationListParams;
  onChange: (filters: Partial<QuotationListParams>) => void;
  onReset: () => void;
}

export const QuotationFilters: React.FC<QuotationFiltersProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.status ||
    filters.from_date ||
    filters.to_date
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div>
          <Input
            id="quotation-search"
            label="Search"
            placeholder="Search by quote # or customer..."
            value={filters.search || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ search: e.target.value })}
            className="w-full"
          />
        </div>

        {/* Status */}
        <div>
          <Select
            id="quotation-status"
            label="Status"
            value={filters.status || ''}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              onChange({
                status: (e.target.value as QuotationStatus) || undefined,
              })
            }
            className="w-full"
          >
            <option value="">All Statuses</option>
            <option value="ISSUED">Issued (Open)</option>
            <option value="ACCEPTED">Accepted / Confirmed</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        {/* From Date */}
        <div>
          <Input
            id="quotation-from-date"
            label="Issued From"
            type="date"
            value={filters.from_date || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ from_date: e.target.value })}
            className="w-full"
          />
        </div>

        {/* To Date */}
        <div>
          <Input
            id="quotation-to-date"
            label="Issued To"
            type="date"
            value={filters.to_date || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ to_date: e.target.value })}
            className="w-full"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="text-gray-500 hover:text-gray-700"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
};
