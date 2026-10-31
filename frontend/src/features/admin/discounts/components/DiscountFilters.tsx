import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../../components/ui';
import {
  DISCOUNT_KINDS,
  DISCOUNT_KIND_LABELS,
  DISCOUNT_SCOPES,
  DISCOUNT_SCOPE_LABELS,
  type DiscountListParams,
} from '../types';

interface DiscountFiltersProps {
  params: DiscountListParams;
  onChange: (updater: (prev: DiscountListParams) => DiscountListParams) => void;
  disabled?: boolean;
}

export function DiscountFilters({ params, onChange, disabled }: DiscountFiltersProps) {
  const hasActiveFilters = Boolean(
    params.search?.trim() || params.kind || params.scope || params.active
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handleKindChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, kind: value || undefined, page: 1 }));
  };

  const handleScopeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, scope: value || undefined, page: 1 }));
  };

  const handleActiveChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, active: value || undefined, page: 1 }));
  };

  const handleClear = () => {
    onChange((prev) => ({
      ...prev,
      search: '',
      kind: '',
      scope: '',
      active: '',
      page: 1,
    }));
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm">
      <div className="flex-1">
        <Input
          label="Search discount"
          type="text"
          placeholder="Filter by discount rule name..."
          value={params.search || ''}
          onChange={handleSearchChange}
          disabled={disabled}
        />
      </div>

      <div className="w-full md:w-44">
        <Select
          label="Discount Type"
          value={params.kind || ''}
          onChange={handleKindChange}
          disabled={disabled}
        >
          <option value="">All Types</option>
          {DISCOUNT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {DISCOUNT_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full md:w-48">
        <Select
          label="Scope"
          value={params.scope || ''}
          onChange={handleScopeChange}
          disabled={disabled}
        >
          <option value="">All Scopes</option>
          {DISCOUNT_SCOPES.map((scope) => (
            <option key={scope} value={scope}>
              {DISCOUNT_SCOPE_LABELS[scope]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full md:w-40">
        <Select
          label="Status"
          value={params.active || ''}
          onChange={handleActiveChange}
          disabled={disabled}
        >
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="pt-2 md:pt-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={disabled}
            className="w-full md:w-auto text-sm text-[#475569] hover:text-[#0F172A]"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
