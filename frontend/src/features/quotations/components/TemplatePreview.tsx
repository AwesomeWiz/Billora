import { paiseToRupees } from '../types';
import type { EditableTemplateLine } from './TemplateLineEditor';
import type { Product, ProductVariant } from '../../admin/products/types';
import type { Plan } from '../../admin/plans/types';
import type { TaxRule } from '../../admin/taxes/types';

interface TemplatePreviewProps {
  name: string;
  planId: string;
  validityDays: number;
  lines: EditableTemplateLine[];
  plans: Plan[];
  products: Product[];
  variantsByProductId: Record<string, ProductVariant[]>;
  taxes: TaxRule[];
}

export function TemplatePreview({
  name,
  planId,
  validityDays,
  lines,
  plans,
  products,
  variantsByProductId,
  taxes,
}: TemplatePreviewProps) {
  const selectedPlan = plans.find((p) => p.id === planId);

  return (
    <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
          Template Configuration Preview
        </h3>
        <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
          Preliminary Blueprint
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-slate-500 block">Template Name:</span>
          <span className="font-semibold text-[#0F172A]">{name || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Subscription Plan:</span>
          <span className="font-semibold text-blue-700">
            {selectedPlan ? `${selectedPlan.name} (${selectedPlan.billing_interval})` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Validity Period:</span>
          <span className="font-semibold text-[#0F172A]">{validityDays} days</span>
        </div>
      </div>

      <div className="border-t border-slate-200/80 pt-2">
        <span className="text-xs font-semibold text-slate-600 block mb-1">
          Lines ({lines.length}):
        </span>
        {lines.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No lines defined.</p>
        ) : (
          <div className="divide-y divide-slate-200/60">
            {lines.map((l, i) => {
              const prod = products.find((p) => p.id === l.product_id);
              const vars = variantsByProductId[l.product_id] || [];
              const selectedVar = vars.find((v) => v.id === l.variant_id);
              const tax = taxes.find((t) => t.id === l.tax_rule_id);

              return (
                <div key={l.id || i} className="py-1.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-[#0F172A]">
                      {prod ? prod.name : 'Unknown product'}
                    </span>
                    {selectedVar && (
                      <span className="ml-1 text-slate-500">
                        [{selectedVar.attribute_name}: {selectedVar.attribute_value}]
                      </span>
                    )}
                    <span className="ml-2 font-mono text-slate-600">× {l.quantity}</span>
                  </div>
                  <div className="text-right text-slate-600 space-x-2">
                    {l.unitPriceRupees.trim() ? (
                      <span className="font-mono text-emerald-700 font-medium">
                        Custom: ₹{parseFloat(l.unitPriceRupees).toFixed(2)}
                      </span>
                    ) : prod ? (
                      <span className="font-mono text-slate-500">
                        Catalog: {paiseToRupees(prod.sales_price_minor, true)}
                      </span>
                    ) : null}

                    {tax && (
                      <span className="inline-flex px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-semibold">
                        {tax.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
        Note: Exact line totals, automatic discounts, and final invoice amounts are computed authoritatively by the backend billing engine when generating customer quotations.
      </div>
    </div>
  );
}
