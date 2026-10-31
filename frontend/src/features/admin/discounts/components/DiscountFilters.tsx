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
  onChange: (params: DiscountListParams) => void;
  disabled?: boolean;
}

export function DiscountFilters({ params, onChange, disabled }: DiscountFiltersProps) {
  const hasActiveFilters = Boolean(
    params.search?.trim() || params.kind || params.scope || params.active
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...params, search: e.target.value, page: 1 });
  };

  const handleKindChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...params, kind: e.target.value || undefined, page: 1 });
  };

  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...params, scope: e.target.value || undefined, page: 1 });
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...params, active: e.target.value || undefined, page: 1 });
  };

  const handleClear = () => {
    onChange({
      page: 1,
      page_size: params.page_size,
    });
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
          options={[
            { label: 'All Types', value: '' },
            ...DISCOUNT_KINDS.map((kind) => ({
              label: DISCOUNT_KIND_LABELS[kind],
              value: kind,
            })),
          ]}
        />
      </div>

      <div className="w-full md:w-48">
        <Select
          label="Scope"
          value={params.scope || ''}
          onChange={handleScopeChange}
          disabled={disabled}
          options={[
            { label: 'All Scopes', value: '' },
            ...DISCOUNT_SCOPES.map((scope) => ({
              label: DISCOUNT_SCOPE_LABELS[scope],
              value: scope,
            })),
          ]}
        />
      </div>

      <div className="w-full md:w-40">
        <Select
          label="Status"
          value={params.active || ''}
          onChange={handleActiveChange}
          disabled={disabled}
          options={[
            { label: 'All Statuses', value: '' },
            { label: 'Active', value: 'true' },
            { label: 'Inactive', value: 'false' },
          ]}
        />
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
