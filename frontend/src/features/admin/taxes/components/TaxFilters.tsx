import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../../components/ui';
import { TAX_SCOPES, TAX_SCOPE_LABELS, type TaxListParams } from '../types';

export interface TaxFiltersProps {
  params: TaxListParams;
  onChange: (updater: (prev: TaxListParams) => TaxListParams) => void;
  disabled?: boolean;
}

export function TaxFilters({ params, onChange, disabled }: TaxFiltersProps) {
  const hasActiveFilters = Boolean(params.search?.trim() || params.scope || params.active);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleScopeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, scope: value, page: 1 }));
  };

  const handleActiveChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, active: value, page: 1 }));
  };

  const handleReset = () => {
    onChange((prev) => ({
      ...prev,
      search: '',
      scope: '',
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
          label="Search by tax name"
          placeholder="Filter taxes..."
          value={params.search ?? ''}
          onChange={handleSearchChange}
          disabled={disabled}
        />
      </div>

      <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
        <Select
          label="Scope"
          value={params.scope ?? ''}
          onChange={handleScopeChange}
          disabled={disabled}
        >
          <option value="">All scopes</option>
          {TAX_SCOPES.map((scope) => (
            <option key={scope} value={scope}>
              {TAX_SCOPE_LABELS[scope]}
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
