import type { ChangeEvent } from 'react';
import { Input, Select, Button } from '../../../components/ui';
import type { QuotationTemplateListParams } from '../types';
import type { Plan } from '../../admin/plans/types';

interface TemplateFiltersProps {
  params: QuotationTemplateListParams;
  plans: Plan[];
  onChange: (updater: (prev: QuotationTemplateListParams) => QuotationTemplateListParams) => void;
  disabled?: boolean;
}

export function TemplateFilters({ params, plans, onChange, disabled }: TemplateFiltersProps) {
  const hasActiveFilters = Boolean(
    params.search?.trim() || params.plan_id || params.active
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, search: value, page: 1 }));
  };

  const handlePlanChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, plan_id: value || undefined, page: 1 }));
  };

  const handleActiveChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange((prev) => ({ ...prev, active: value || undefined, page: 1 }));
  };

  const handleClear = () => {
    onChange((prev) => ({
      ...prev,
      search: '',
      plan_id: '',
      active: '',
      page: 1,
    }));
  };

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-3 bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm">
      <div className="flex-1">
        <Input
          label="Search template"
          type="text"
          placeholder="Filter by quotation template name..."
          value={params.search || ''}
          onChange={handleSearchChange}
          disabled={disabled}
        />
      </div>

      <div className="w-full md:w-56">
        <Select
          label="Subscription Plan"
          value={params.plan_id || ''}
          onChange={handlePlanChange}
          disabled={disabled}
        >
          <option value="">All Plans</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.billing_interval})
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
