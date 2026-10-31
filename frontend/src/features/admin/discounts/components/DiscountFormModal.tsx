import { useState, useEffect } from 'react';
import { Input, Select, Button } from '../../../../components/ui';
import {
  DISCOUNT_KINDS,
  DISCOUNT_KIND_LABELS,
  DISCOUNT_SCOPES,
  DISCOUNT_SCOPE_LABELS,
  rupeesToPaise,
  paiseToRupees,
  percentToBps,
  bpsToPercent,
  type DiscountRule,
  type DiscountKind,
  type DiscountScope,
  type CreateDiscountInput,
  type UpdateDiscountInput,
} from '../types';
import { productService } from '../../products/services/productService';
import type { Product } from '../../products/types';

interface DiscountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDiscountInput | UpdateDiscountInput) => Promise<void>;
  initialData?: DiscountRule | null;
}

export function DiscountFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: DiscountFormModalProps) {
  const isEditing = Boolean(initialData);

  // Form states
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DiscountKind>('PERCENT');
  const [rupeesInput, setRupeesInput] = useState('');
  const [percentInput, setPercentInput] = useState('');
  const [scope, setScope] = useState<DiscountScope>('SUBSCRIPTION');
  const [productId, setProductId] = useState('');
  const [minQuantityInput, setMinQuantityInput] = useState('');
  const [minPurchaseRupeesInput, setMinPurchaseRupeesInput] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [maxUsesInput, setMaxUsesInput] = useState('');
  const [priorityInput, setPriorityInput] = useState('0');
  const [active, setActive] = useState(true);

  // Products lookup for PRODUCT scope
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Submission & Validation states
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Load products list if needed
  useEffect(() => {
    let mounted = true;
    async function fetchProducts() {
      setLoadingProducts(true);
      setProductError(null);
      try {
        const res = await productService.listProducts({ page_size: 100 });
        if (mounted) {
          setProducts(res.items || []);
        }
      } catch (err: unknown) {
        if (mounted) {
          setProductError('Failed to load products for selection.');
        }
      } finally {
        if (mounted) {
          setLoadingProducts(false);
        }
      }
    }

    if (isOpen) {
      fetchProducts();
    }

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setName(initialData.name);
      setKind(initialData.kind);
      setRupeesInput(initialData.value_minor !== null && initialData.value_minor !== undefined ? paiseToRupees(initialData.value_minor, false) : '');
      setPercentInput(initialData.percent_bps !== null && initialData.percent_bps !== undefined ? bpsToPercent(initialData.percent_bps, false) : '');
      setScope(initialData.scope);
      setProductId(initialData.product_id || '');
      setMinQuantityInput(initialData.min_quantity ? String(initialData.min_quantity) : '');
      setMinPurchaseRupeesInput(initialData.min_purchase_minor ? paiseToRupees(initialData.min_purchase_minor, false) : '');
      setStartsOn(initialData.starts_on ? initialData.starts_on.slice(0, 10) : '');
      setEndsOn(initialData.ends_on ? initialData.ends_on.slice(0, 10) : '');
      setMaxUsesInput(initialData.max_uses ? String(initialData.max_uses) : '');
      setPriorityInput(String(initialData.priority ?? 0));
      setActive(initialData.active);
    } else {
      setName('');
      setKind('PERCENT');
      setRupeesInput('');
      setPercentInput('10'); // Default 10%
      setScope('SUBSCRIPTION');
      setProductId('');
      setMinQuantityInput('');
      setMinPurchaseRupeesInput('');
      setStartsOn('');
      setEndsOn('');
      setMaxUsesInput('');
      setPriorityInput('0');
      setActive(true);
    }
    setErrors({});
    setServerError(null);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Discount name is required.';
    }

    if (kind === 'FIXED') {
      const paise = rupeesToPaise(rupeesInput);
      if (paise === null || paise <= 0) {
        errs.value = 'Please enter a valid discount amount in rupees (> ₹0.00).';
      }
    } else if (kind === 'PERCENT') {
      const bps = percentToBps(percentInput);
      if (bps === null || bps <= 0 || bps > 10000) {
        errs.value = 'Please enter a valid percentage between 0.01% and 100%.';
      }
    }

    if (scope === 'PRODUCT' && !productId) {
      errs.product_id = 'A product must be selected for product-specific discounts.';
    }

    if (minQuantityInput.trim()) {
      const qty = parseInt(minQuantityInput.trim(), 10);
      if (Number.isNaN(qty) || qty < 1) {
        errs.min_quantity = 'Minimum quantity must be an integer of at least 1.';
      }
    }

    if (minPurchaseRupeesInput.trim()) {
      const purchaseMinor = rupeesToPaise(minPurchaseRupeesInput.trim());
      if (purchaseMinor === null || purchaseMinor < 0) {
        errs.min_purchase = 'Minimum purchase amount must be a non-negative amount.';
      }
    }

    if (maxUsesInput.trim()) {
      const maxUses = parseInt(maxUsesInput.trim(), 10);
      if (Number.isNaN(maxUses) || maxUses < 1) {
        errs.max_uses = 'Maximum redemptions must be an integer of at least 1.';
      }
    }

    if (priorityInput.trim()) {
      const prio = parseInt(priorityInput.trim(), 10);
      if (Number.isNaN(prio)) {
        errs.priority = 'Priority must be an integer.';
      }
    }

    if (startsOn && endsOn && endsOn < startsOn) {
      errs.ends_on = 'End date cannot be earlier than start date.';
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
      const isFixed = kind === 'FIXED';
      const fixedPaise = isFixed ? rupeesToPaise(rupeesInput) : null;
      const bps = !isFixed ? percentToBps(percentInput) : null;

      const payload: CreateDiscountInput = {
        name: name.trim(),
        kind,
        value_minor: isFixed ? fixedPaise : null,
        percent_bps: !isFixed ? bps : null,
        scope,
        product_id: scope === 'PRODUCT' ? productId : null,
        min_quantity: minQuantityInput.trim() ? parseInt(minQuantityInput.trim(), 10) : null,
        min_purchase_minor: minPurchaseRupeesInput.trim() ? rupeesToPaise(minPurchaseRupeesInput.trim()) : null,
        starts_on: startsOn || null,
        ends_on: endsOn || null,
        max_uses: maxUsesInput.trim() ? parseInt(maxUsesInput.trim(), 10) : null,
        priority: priorityInput.trim() ? parseInt(priorityInput.trim(), 10) : 0,
        active,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to save discount rule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discount-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <h2 id="discount-modal-title" className="text-lg font-bold text-[#0F172A]">
            {isEditing ? 'Edit Discount Rule' : 'Create Discount Rule'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Rule Name */}
          <div>
            <Input
              label="Discount Rule Name *"
              type="text"
              placeholder="e.g. Festive 15% Off or Bulk Quantity Discount"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              error={errors.name}
            />
          </div>

          {/* Kind & Dynamic Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Discount Type *"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as DiscountKind);
                  setErrors((prev) => ({ ...prev, value: '' }));
                }}
                disabled={submitting}
                options={DISCOUNT_KINDS.map((k) => ({
                  label: DISCOUNT_KIND_LABELS[k],
                  value: k,
                }))}
              />
            </div>

            <div>
              {kind === 'FIXED' ? (
                <div>
                  <Input
                    label="Discount Amount (₹) *"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 250 or 500.00"
                    value={rupeesInput}
                    onChange={(e) => setRupeesInput(e.target.value)}
                    disabled={submitting}
                    error={errors.value}
                  />
                  {rupeesToPaise(rupeesInput) !== null && (
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      Stored internally: {rupeesToPaise(rupeesInput)} paise
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Input
                    label="Percentage Discount (%) *"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 15 or 12.5"
                    value={percentInput}
                    onChange={(e) => setPercentInput(e.target.value)}
                    disabled={submitting}
                    error={errors.value}
                  />
                  {percentToBps(percentInput) !== null && (
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                      Stored as basis points: {percentToBps(percentInput)} bps
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scope and Conditional Product */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Select
                label="Scope *"
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as DiscountScope);
                  setErrors((prev) => ({ ...prev, product_id: '' }));
                }}
                disabled={submitting}
                options={DISCOUNT_SCOPES.map((s) => ({
                  label: DISCOUNT_SCOPE_LABELS[s],
                  value: s,
                }))}
              />
              <p className="text-xs text-slate-500 mt-1">
                {scope === 'PRODUCT'
                  ? 'Applies specifically to lines containing the chosen product.'
                  : 'Applies to the entire subscription invoice subtotal.'}
              </p>
            </div>

            {scope === 'PRODUCT' ? (
              <div>
                <Select
                  label="Target Product *"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={submitting || loadingProducts}
                  options={[
                    { label: loadingProducts ? 'Loading products...' : 'Select a product...', value: '' },
                    ...products.map((p) => ({
                      label: `${p.name} (${p.type})`,
                      value: p.id,
                    })),
                  ]}
                  error={errors.product_id || productError || undefined}
                />
              </div>
            ) : (
              <div className="flex items-center pt-6 text-xs text-slate-400 italic">
                No product selection needed for whole-subscription scope.
              </div>
            )}
          </div>

          {/* Eligibility Thresholds */}
          <div className="border-t border-[#E2E8F0] pt-4 mt-2">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Eligibility Constraints (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Min Quantity"
                  type="number"
                  placeholder="e.g. 5"
                  value={minQuantityInput}
                  onChange={(e) => setMinQuantityInput(e.target.value)}
                  disabled={submitting}
                  error={errors.min_quantity}
                />
              </div>

              <div>
                <Input
                  label="Min Purchase (₹)"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 1000.00"
                  value={minPurchaseRupeesInput}
                  onChange={(e) => setMinPurchaseRupeesInput(e.target.value)}
                  disabled={submitting}
                  error={errors.min_purchase}
                />
                {minPurchaseRupeesInput.trim() && rupeesToPaise(minPurchaseRupeesInput) !== null && (
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    {rupeesToPaise(minPurchaseRupeesInput)} paise
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date Validity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Effective From"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <Input
                label="Effective To"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                disabled={submitting}
                error={errors.ends_on}
              />
            </div>
          </div>

          {/* Usage Limit & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Max Allowed Usages"
                type="number"
                placeholder="Leave blank for unlimited"
                value={maxUsesInput}
                onChange={(e) => setMaxUsesInput(e.target.value)}
                disabled={submitting}
                error={errors.max_uses}
              />
              <p className="text-xs text-slate-500 mt-1">
                Server maintains actual usage redemptions count safely.
              </p>
            </div>

            <div>
              <Input
                label="Priority Order"
                type="number"
                placeholder="0"
                value={priorityInput}
                onChange={(e) => setPriorityInput(e.target.value)}
                disabled={submitting}
                error={errors.priority}
              />
              <p className="text-xs text-slate-500 mt-1">
                Higher priority rules evaluate first when non-stacking rules compete.
              </p>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="discount-active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-gray-300 text-[#5B4DDB] focus:ring-[#5B4DDB]"
            />
            <label htmlFor="discount-active" className="text-sm font-medium text-[#0F172A] cursor-pointer">
              Active rule (eligible for backend automatic invoice application)
            </label>
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
              {submitting ? 'Saving...' : isEditing ? 'Update Discount' : 'Create Discount'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
