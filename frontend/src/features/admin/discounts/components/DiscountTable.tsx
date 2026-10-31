import { StatusBadge, Button } from '../../../../components/ui';
import {
  bpsToPercent,
  paiseToRupees,
  type DiscountRule,
  DISCOUNT_SCOPE_LABELS,
  DISCOUNT_KIND_LABELS,
} from '../types';

interface DiscountTableProps {
  discounts: DiscountRule[];
  isAdmin: boolean;
  onEdit: (discount: DiscountRule) => void;
  onToggleActive: (discount: DiscountRule) => void;
  togglingId: string | null;
}

export function DiscountTable({
  discounts,
  isAdmin,
  onEdit,
  onToggleActive,
  togglingId,
}: DiscountTableProps) {
  const formatDiscountValue = (discount: DiscountRule) => {
    if (discount.kind === 'FIXED') {
      return (
        <span className="font-semibold text-[#0F172A]">
          {paiseToRupees(discount.value_minor ?? 0, true)}
        </span>
      );
    }
    if (discount.kind === 'PERCENT') {
      return (
        <span className="font-semibold text-[#5B4DDB]">
          {bpsToPercent(discount.percent_bps ?? 0, true)}{' '}
          <span className="text-xs text-[#64748B] font-normal">
            ({discount.percent_bps ?? 0} bps)
          </span>
        </span>
      );
    }
    return '—';
  };

  const formatUsage = (discount: DiscountRule) => {
    const uses = discount.uses_count ?? 0;
    if (discount.max_uses !== null && discount.max_uses !== undefined && discount.max_uses > 0) {
      const isExhausted = uses >= discount.max_uses;
      return (
        <div>
          <span className={`font-mono text-sm ${isExhausted ? 'text-[#DC2626] font-medium' : 'text-[#0F172A]'}`}>
            {uses} / {discount.max_uses}
          </span>
          {isExhausted && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
              Exhausted
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="text-xs text-[#64748B]">
        {uses} used <span className="text-slate-400 font-mono">(unlimited)</span>
      </span>
    );
  };

  const formatThresholds = (discount: DiscountRule) => {
    const parts: string[] = [];
    if (discount.min_quantity && discount.min_quantity > 0) {
      parts.push(`Qty ≥ ${discount.min_quantity}`);
    }
    if (discount.min_purchase_minor && discount.min_purchase_minor > 0) {
      parts.push(`Spend ≥ ${paiseToRupees(discount.min_purchase_minor, true)}`);
    }
    return parts.length > 0 ? parts.join(', ') : 'None';
  };

  const formatDates = (discount: DiscountRule) => {
    if (!discount.starts_on && !discount.ends_on) return 'Indefinite';
    const from = discount.starts_on ? discount.starts_on.slice(0, 10) : 'Immediate';
    const to = discount.ends_on ? discount.ends_on.slice(0, 10) : 'Indefinite';
    return `${from} → ${to}`;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
      <table className="w-full text-left text-sm text-[#0F172A] border-collapse">
        <thead className="bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wider text-[#64748B] border-b border-[#E2E8F0]">
          <tr>
            <th scope="col" className="px-4 py-3.5">Name</th>
            <th scope="col" className="px-4 py-3.5">Type & Value</th>
            <th scope="col" className="px-4 py-3.5">Scope / Product</th>
            <th scope="col" className="px-4 py-3.5">Thresholds</th>
            <th scope="col" className="px-4 py-3.5">Validity</th>
            <th scope="col" className="px-4 py-3.5">Usage</th>
            <th scope="col" className="px-4 py-3.5">Priority</th>
            <th scope="col" className="px-4 py-3.5">Status</th>
            {isAdmin && <th scope="col" className="px-4 py-3.5 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {discounts.map((discount) => {
            const isToggling = togglingId === discount.id;
            return (
              <tr
                key={discount.id}
                className="hover:bg-[#F8FAFC] transition-colors"
                data-testid={`discount-row-${discount.id}`}
              >
                <td className="px-4 py-3 font-medium text-[#0F172A]">
                  <div>{discount.name}</div>
                  <div className="text-xs text-[#94A3B8] font-mono mt-0.5">{discount.id}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-[#64748B] mb-0.5">
                    {DISCOUNT_KIND_LABELS[discount.kind] ?? discount.kind}
                  </div>
                  <div>{formatDiscountValue(discount)}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      discount.scope === 'PRODUCT'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {DISCOUNT_SCOPE_LABELS[discount.scope] ?? discount.scope}
                  </span>
                  {discount.scope === 'PRODUCT' && (
                    <div className="text-xs text-[#475569] mt-1 font-medium truncate max-w-[160px]" title={discount.product_name || discount.product_id || ''}>
                      {discount.product_name ? `Product: ${discount.product_name}` : `ID: ${discount.product_id}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[#475569]">
                  {formatThresholds(discount)}
                </td>
                <td className="px-4 py-3 text-xs text-[#475569] whitespace-nowrap">
                  {formatDates(discount)}
                </td>
                <td className="px-4 py-3">
                  {formatUsage(discount)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">
                  {discount.priority}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={discount.active ? 'active' : 'inactive'} />
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(discount)}
                      className="text-xs h-7 px-2.5"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleActive(discount)}
                      disabled={isToggling}
                      className={`text-xs h-7 px-2.5 ${
                        discount.active
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {isToggling
                        ? 'Saving...'
                        : discount.active
                        ? 'Deactivate'
                        : 'Activate'}
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
