import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../../components/ui';
import { BILLING_INTERVALS, BILLING_INTERVAL_LABELS, type PlanListParams } from '../types';

export interface PlanFiltersProps {
  params: PlanListParams;
  onChange: (updater: (prev: PlanListParams) => PlanListParams) => void;
  disabled?: boolean;
}

export function PlanFilters({ params, onChange, disabled }: PlanFiltersProps) {
  const hasActiveFilters = Boolean(params.search?.trim() || params.billing_interval || params.active);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleIntervalChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, billing_interval: value, page: 1 }));
  };

  const handleActiveChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, active: value, page: 1 }));
  };

  const handleReset = () => {
    onChange((prev) => ({
      ...prev,
      search: '',
      billing_interval: '',
      active: '',
      page: 1,
    }));
  };

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-end',
      }}
    >
      <div style={{ flex: '1 1 240px', minWidth: '200px' }}>
        <Input
          label="Search by plan name"
          placeholder="Filter plans..."
          value={params.search ?? ''}
          onChange={handleSearchChange}
          disabled={disabled}
        />
      </div>

      <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
        <Select
          label="Billing interval"
          value={params.billing_interval ?? ''}
          onChange={handleIntervalChange}
          disabled={disabled}
        >
          <option value="">All intervals</option>
          {BILLING_INTERVALS.map((interval) => (
            <option key={interval} value={interval}>
              {BILLING_INTERVAL_LABELS[interval]}
            </option>
          ))}
        </Select>
      </div>

      <div style={{ flex: '0 1 160px', minWidth: '140px' }}>
        <Select
          label="Status"
          value={params.active ?? ''}
          onChange={handleActiveChange}
          disabled={disabled}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      {hasActiveFilters && (
        <div style={{ paddingBottom: '2px' }}>
          <Button variant="ghost" onClick={handleReset} disabled={disabled}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
