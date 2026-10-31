import { Input, Select, Button } from '../../../components/ui';
import type { Product, ProductVariant } from '../../admin/products/types';
import type { TaxRule } from '../../admin/taxes/types';
import { rupeesToPaise } from '../types';

export interface EditableTemplateLine {
  id: string; // client temporary id
  product_id: string;
  variant_id?: string;
  quantity: number;
  unitPriceRupees: string;
  tax_rule_id?: string;
}

interface TemplateLineEditorProps {
  lines: EditableTemplateLine[];
  onChange: (lines: EditableTemplateLine[]) => void;
  products: Product[];
  variantsByProductId: Record<string, ProductVariant[]>;
  taxes: TaxRule[];
  disabled?: boolean;
  errors?: Record<string, string>;
}

export function TemplateLineEditor({
  lines,
  onChange,
  products,
  variantsByProductId,
  taxes,
  disabled,
  errors = {},
}: TemplateLineEditorProps) {
  const handleAddLine = () => {
    const newLine: EditableTemplateLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: products[0]?.id || '',
      quantity: 1,
      unitPriceRupees: '',
      tax_rule_id: '',
    };
    onChange([...lines, newLine]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateLine = (index: number, updates: Partial<EditableTemplateLine>) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#0F172A]">
          Quotation Template Product Lines *
        </label>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddLine}
          disabled={disabled || products.length === 0}
          className="text-xs h-7 px-2.5"
        >
          + Add Product Line
        </Button>
      </div>

      {errors.lines && (
        <p className="text-xs text-red-600 font-medium" role="alert">
          {errors.lines}
        </p>
      )}

      {lines.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
          No product lines added yet. Click &quot;+ Add Product Line&quot; to attach products.
        </div>
      ) : (
        <div className="space-y-3">
          {lines.map((line, idx) => {
            const availableVariants = variantsByProductId[line.product_id] || [];
            const selectedProduct = products.find((p) => p.id === line.product_id);
            const lineErrorPrefix = `line_${idx}`;

            return (
              <div
                key={line.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Line #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(idx)}
                    disabled={disabled}
                    className="text-red-600 hover:text-red-700 font-normal hover:underline"
                  >
                    Remove Line
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Product Selector */}
                  <div className="sm:col-span-2">
                    <Select
                      label="Product *"
                      value={line.product_id}
                      onChange={(e) => {
                        handleUpdateLine(idx, {
                          product_id: e.target.value,
                          variant_id: undefined, // reset variant when product changes
                        });
                      }}
                      disabled={disabled}
                      error={errors[`${lineErrorPrefix}_product`]}
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.type})
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Optional Variant Selector */}
                  <div>
                    <Select
                      label="Variant (Optional)"
                      value={line.variant_id || ''}
                      onChange={(e) =>
                        handleUpdateLine(idx, { variant_id: e.target.value || undefined })
                      }
                      disabled={disabled || availableVariants.length === 0}
                    >
                      <option value="">Standard (No variant)</option>
                      {availableVariants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.attribute_name}: {v.attribute_value}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Quantity Input */}
                  <div>
                    <Input
                      label="Quantity *"
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleUpdateLine(idx, { quantity: Number.isNaN(val) ? 1 : val });
                      }}
                      disabled={disabled}
                      error={errors[`${lineErrorPrefix}_quantity`]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  {/* Optional Unit Price Override */}
                  <div>
                    <Input
                      label="Unit Price Override (₹)"
                      type="text"
                      inputMode="decimal"
                      placeholder={
                        selectedProduct
                          ? `Catalog: ₹${(selectedProduct.sales_price_minor / 100).toFixed(2)}`
                          : 'e.g. 500.00'
                      }
                      value={line.unitPriceRupees}
                      onChange={(e) => handleUpdateLine(idx, { unitPriceRupees: e.target.value })}
                      disabled={disabled}
                      error={errors[`${lineErrorPrefix}_price`]}
                    />
                    {line.unitPriceRupees.trim() && rupeesToPaise(line.unitPriceRupees) !== null && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Stored: {rupeesToPaise(line.unitPriceRupees)} paise
                      </span>
                    )}
                  </div>

                  {/* Optional Tax Rule */}
                  <div>
                    <Select
                      label="Tax Rule (Optional)"
                      value={line.tax_rule_id || ''}
                      onChange={(e) =>
                        handleUpdateLine(idx, { tax_rule_id: e.target.value || undefined })
                      }
                      disabled={disabled}
                    >
                      <option value="">No explicit tax (Auto/Global)</option>
                      {taxes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({(t.rate_bps / 100).toFixed(2)}%)
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
