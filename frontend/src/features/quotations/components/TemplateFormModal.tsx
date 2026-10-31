import { useState } from 'react';
import { Input, Select, Button } from '../../../components/ui';
import type { CreateQuotationTemplateInput } from '../types';
import { TemplateLineEditor, type EditableTemplateLine } from './TemplateLineEditor';
import { TemplatePreview } from './TemplatePreview';
import type { Product, ProductVariant } from '../../admin/products/types';
import type { Plan } from '../../admin/plans/types';
import type { TaxRule } from '../../admin/taxes/types';
import { rupeesToPaise } from '../types';

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateQuotationTemplateInput) => Promise<void>;
  plans: Plan[];
  products: Product[];
  variantsByProductId: Record<string, ProductVariant[]>;
  taxes: TaxRule[];
}

export function TemplateFormModal({
  isOpen,
  onClose,
  onSubmit,
  plans,
  products,
  variantsByProductId,
  taxes,
}: TemplateFormModalProps) {
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id || '');
  const [validityDaysInput, setValidityDaysInput] = useState('30');
  const [active, setActive] = useState(true);

  const [lines, setLines] = useState<EditableTemplateLine[]>([
    {
      id: 'default_line_1',
      product_id: products[0]?.id || '',
      quantity: 1,
      unitPriceRupees: '',
      tax_rule_id: '',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Template name is required.';
    }

    if (!planId) {
      errs.plan_id = 'A subscription plan is required.';
    }

    const validity = parseInt(validityDaysInput.trim(), 10);
    if (Number.isNaN(validity) || validity <= 0) {
      errs.validity_days = 'Validity duration must be a positive integer greater than zero.';
    }

    if (lines.length === 0) {
      errs.lines = 'At least one product line is required to build a template.';
    } else {
      lines.forEach((line, idx) => {
        if (!line.product_id) {
          errs[`line_${idx}_product`] = 'Product selection is required.';
        }
        if (!line.quantity || line.quantity < 1) {
          errs[`line_${idx}_quantity`] = 'Quantity must be at least 1.';
        }
        if (line.unitPriceRupees.trim()) {
          const paise = rupeesToPaise(line.unitPriceRupees);
          if (paise === null || paise < 0) {
            errs[`line_${idx}_price`] = 'Invalid unit price.';
          }
        }
      });
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setServerError(null);

    try {
      const payload: CreateQuotationTemplateInput = {
        name: name.trim(),
        plan_id: planId,
        validity_days: parseInt(validityDaysInput.trim(), 10),
        active,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          variant_id: l.variant_id || null,
          quantity: l.quantity,
          unit_price_minor: l.unitPriceRupees.trim() ? rupeesToPaise(l.unitPriceRupees.trim()) : null,
          tax_rule_id: l.tax_rule_id || null,
        })),
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create quotation template.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div>
            <h2 id="template-modal-title" className="text-lg font-bold text-[#0F172A]">
              Create Reusable Quotation Template
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define standard plans, product packages, and validity terms to streamline sales quotes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* General Template Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Template Name *"
                type="text"
                placeholder="e.g. Standard SaaS Growth Package"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                error={errors.name}
              />
            </div>

            <div>
              <Input
                label="Validity (Days) *"
                type="number"
                min="1"
                placeholder="30"
                value={validityDaysInput}
                onChange={(e) => setValidityDaysInput(e.target.value)}
                disabled={submitting}
                error={errors.validity_days}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Subscription Plan *"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                disabled={submitting}
                error={errors.plan_id}
              >
                <option value="">Select a subscription plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.billing_interval})
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-gray-300 text-[#5B4DDB] focus:ring-[#5B4DDB]"
                />
                <span className="text-sm font-medium text-[#0F172A]">
                  Active template (available for quotation creation)
                </span>
              </label>
            </div>
          </div>

          {/* Product Lines Section */}
          <div className="border-t border-[#E2E8F0] pt-4">
            <TemplateLineEditor
              lines={lines}
              onChange={setLines}
              products={products}
              variantsByProductId={variantsByProductId}
              taxes={taxes}
              disabled={submitting}
              errors={errors}
            />
          </div>

          {/* Live Blueprint Preview */}
          <div className="border-t border-[#E2E8F0] pt-4">
            <TemplatePreview
              name={name}
              planId={planId}
              validityDays={parseInt(validityDaysInput.trim(), 10) || 0}
              lines={lines}
              plans={plans}
              products={products}
              variantsByProductId={variantsByProductId}
              taxes={taxes}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#E2E8F0]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="bg-[#5B4DDB] hover:bg-[#4a3dc4] text-white"
            >
              {submitting ? 'Creating Template...' : 'Save Template'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
