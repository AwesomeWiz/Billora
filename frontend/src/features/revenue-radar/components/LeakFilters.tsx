import React from 'react';
import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../components/ui';
import type { LeakRadarFilterParams } from '../types';

interface LeakFiltersProps {
  filters: LeakRadarFilterParams;
  onChange: (updates: Partial<LeakRadarFilterParams>) => void;
  onReset: () => void;
  disabled?: boolean;
}

export const LeakFilters: React.FC<LeakFiltersProps> = ({
  filters,
  onChange,
  onReset,
  disabled = false,
}) => {
  const hasActiveFilters = Boolean(
    filters.severity || filters.rule || filters.search?.trim()
  );

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Search */}
        <div>
          <Input
            id="leak-search"
            label="Search Findings"
            placeholder="Search by title, explanation, entity ID, or customer..."
            value={filters.search || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ search: e.target.value })}
            disabled={disabled}
            className="w-full text-xs"
          />
        </div>

        {/* Severity */}
        <div>
          <Select
            id="leak-severity"
            label="Severity"
            value={filters.severity || ''}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ severity: e.target.value })}
            disabled={disabled}
            className="w-full text-xs"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </Select>
        </div>

        {/* Rule / Type */}
        <div>
          <Select
            id="leak-rule"
            label="Detection Rule"
            value={filters.rule || ''}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange({ rule: e.target.value })}
            disabled={disabled}
            className="w-full text-xs"
          >
            <option value="">All Detection Rules</option>
            <option value="BILLING_MISSED">Missed Billing (BILLING_MISSED)</option>
            <option value="INVOICE_OVERDUE">Overdue Invoice (INVOICE_OVERDUE)</option>
            <option value="BILLING_BLOCKED">Blocked Configuration (BILLING_BLOCKED)</option>
            <option value="INVOICE_ANOMALY">Invoice Review Finding (INVOICE_ANOMALY)</option>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={disabled}
            className="text-gray-500 hover:text-gray-700 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
};
