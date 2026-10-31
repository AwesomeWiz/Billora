import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../../components/ui';
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type ProductListParams } from '../types';

export interface ProductFiltersProps {
  params: ProductListParams;
  onChange: (updater: (prev: ProductListParams) => ProductListParams) => void;
  disabled?: boolean;
}

export function ProductFilters({ params, onChange, disabled }: ProductFiltersProps) {
  const hasActiveFilters = Boolean(params.search?.trim() || params.type || params.active);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, type: value, page: 1 }));
  };

  const handleActiveChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, active: value, page: 1 }));
  };

  const handleReset = () => {
    onChange((prev) => ({
      ...prev,
      search: '',
      type: '',
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
          label="Search by name"
          placeholder="Filter products..."
          value={params.search ?? ''}
          onChange={handleSearchChange}
          disabled={disabled}
        />
      </div>

      <div style={{ flex: '0 1 180px', minWidth: '150px' }}>
        <Select
          label="Product type"
          value={params.type ?? ''}
          onChange={handleTypeChange}
          disabled={disabled}
        >
          <option value="">All types</option>
          {PRODUCT_TYPES.map((type) => (
            <option key={type} value={type}>
              {PRODUCT_TYPE_LABELS[type]}
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
