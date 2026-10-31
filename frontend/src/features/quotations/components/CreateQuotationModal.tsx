import React, { useState, useEffect, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { Button, Input, Select } from '../../../components/ui';
import { quotationTemplateService } from '../services/quotationTemplateService';
import { customerApi, type CustomerAccount } from '../../customer/api';
import { productService } from '../../admin/products/services/productService';
import { taxService } from '../../admin/taxes/services/taxService';
import { paiseToRupees, rupeesToPaise } from '../types';
import type {
  QuotationTemplate,
  CreateQuotationInput,
  CreateQuotationLineInput,
} from '../types';
import type { Product, ProductVariant } from '../../admin/products/types';
import type { TaxRule } from '../../admin/taxes/types';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateQuotationInput) => Promise<void>;
  loading?: boolean;
}

interface EditableLineItem {
  id: string;
  source_product_id: string;
  product_name: string;
  variant_id: string;
  variant_name: string;
  quantity: number;
  unitPriceInput: string;
  tax_rule_id: string;
  description: string;
}

export const CreateQuotationModal: React.FC<CreateQuotationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  // Wizard steps: 1 = Customer & Template, 2 = Review & Edit Lines, 3 = Summary & Preview
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // External data sources
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsByProductId, setVariantsByProductId] = useState<Record<string, ProductVariant[]>>({});
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form selections
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [terms, setTerms] = useState('');

  // Editable lines
  const [lines, setLines] = useState<EditableLineItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load auxiliary data on open
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedAccountId('');
      setSelectedTemplateId('');
      setValidityDays(30);
      setTerms('');
      setLines([]);
      setSubmitError(null);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setDataLoading(true);
      setLoadError(null);
      try {
        const [customerRes, templateRes, productRes, taxRes] = await Promise.allSettled([
          customerApi.list('page=1&page_size=100'),
          quotationTemplateService.listTemplates({ page: 1, page_size: 100, active: 'true' }),
          productService.listProducts({ page: 1, page_size: 100 }),
          taxService.listTaxes({ page: 1, page_size: 100, active: 'true' }),
        ]);

        if (!isMounted) return;

        if (customerRes.status === 'fulfilled' && customerRes.value?.items) {
          setCustomers(customerRes.value.items);
        }
        if (templateRes.status === 'fulfilled' && templateRes.value?.items) {
          setTemplates(templateRes.value.items);
        }
        if (productRes.status === 'fulfilled' && productRes.value?.items) {
          setProducts(productRes.value.items);
          // Fetch variants for each product
          const variantMap: Record<string, ProductVariant[]> = {};
          await Promise.allSettled(
            productRes.value.items.map(async (prod) => {
              try {
                const variants = await productService.listVariants(prod.id);
                variantMap[prod.id] = variants;
              } catch {
                variantMap[prod.id] = [];
              }
            })
          );
          if (isMounted) {
            setVariantsByProductId(variantMap);
          }
        }
        if (taxRes.status === 'fulfilled' && taxRes.value?.items) {
          setTaxRules(taxRes.value.items);
        }
      } catch (err) {
        if (isMounted) {
          setLoadError('Failed to load auxiliary quotation data.');
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle template selection change
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (template.validity_days) {
      setValidityDays(template.validity_days);
    }

    // Convert template lines to editable lines
    const editableLines: EditableLineItem[] = template.lines.map((l, idx) => {
      const prod = products.find((p) => p.id === l.product_id);
      const variants = variantsByProductId[l.product_id] || [];
      const variant = variants.find((v) => v.id === l.variant_id);
      const defaultMinor =
        l.unit_price_minor ??
        (prod ? prod.sales_price_minor + (variant?.price_delta_minor ?? 0) : 0);

      return {
        id: `tpl-line-${idx}-${Date.now()}`,
        source_product_id: l.product_id,
        product_name: l.product_name || prod?.name || 'Selected Product',
        variant_id: l.variant_id || '',
        variant_name: l.variant_name || (variant ? `${variant.attribute_name}: ${variant.attribute_value}` : ''),
        quantity: l.quantity > 0 ? l.quantity : 1,
        unitPriceInput: paiseToRupees(defaultMinor),
        tax_rule_id: l.tax_rule_id || '',
        description: '',
      };
    });

    setLines(editableLines);
  };

  // Add a blank custom line
  const handleAddLine = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    const variants = variantsByProductId[defaultProd.id] || [];
    const defaultVariant = variants[0];
    const priceMinor = defaultProd.sales_price_minor + (defaultVariant?.price_delta_minor ?? 0);

    setLines((prev) => [
      ...prev,
      {
        id: `custom-line-${Date.now()}`,
        source_product_id: defaultProd.id,
        product_name: defaultProd.name,
        variant_id: defaultVariant?.id || '',
        variant_name: defaultVariant ? `${defaultVariant.attribute_name}: ${defaultVariant.attribute_value}` : '',
        quantity: 1,
        unitPriceInput: paiseToRupees(priceMinor),
        tax_rule_id: '',
        description: '',
      },
    ]);
  };

  const handleUpdateLine = (index: number, updates: Partial<EditableLineItem>) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const variants = variantsByProductId[prod.id] || [];
    const variant = variants[0];
    const priceMinor = prod.sales_price_minor + (variant?.price_delta_minor ?? 0);

    handleUpdateLine(index, {
      source_product_id: prod.id,
      product_name: prod.name,
      variant_id: variant?.id || '',
      variant_name: variant ? `${variant.attribute_name}: ${variant.attribute_value}` : '',
      unitPriceInput: paiseToRupees(priceMinor),
    });
  };

  const handleVariantChange = (index: number, variantId: string) => {
    const currentLine = lines[index];
    const variants = variantsByProductId[currentLine.source_product_id] || [];
    const variant = variants.find((v) => v.id === variantId);
    const prod = products.find((p) => p.id === currentLine.source_product_id);
    const baseMinor = prod ? prod.sales_price_minor : 0;
    const priceMinor = baseMinor + (variant?.price_delta_minor ?? 0);

    handleUpdateLine(index, {
      variant_id: variantId,
      variant_name: variant ? `${variant.attribute_name}: ${variant.attribute_value}` : '',
      unitPriceInput: paiseToRupees(priceMinor),
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Estimated non-authoritative preview calculation
  const previewSubtotalMinor = useMemo(() => {
    return lines.reduce((acc, line) => {
      const paise = rupeesToPaise(line.unitPriceInput) ?? 0;
      return acc + paise * (line.quantity || 0);
    }, 0);
  }, [lines]);

  const selectedCustomer = customers.find((c) => c.id === selectedAccountId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedAccountId) {
        setSubmitError('Please select a customer account to proceed.');
        return;
      }
      setSubmitError(null);
      setStep(2);
    } else if (step === 2) {
      if (lines.length === 0) {
        setSubmitError('Please add at least one line item to the quotation.');
        return;
      }
      for (const line of lines) {
        if (!line.source_product_id) {
          setSubmitError('Each line item must have a valid product selected.');
          return;
        }
        if (line.quantity <= 0) {
          setSubmitError('Line quantities must be 1 or greater.');
          return;
        }
        const unitMinor = rupeesToPaise(line.unitPriceInput);
        if (unitMinor === null || unitMinor < 0) {
          setSubmitError('Please provide a valid non-negative unit price for all lines.');
          return;
        }
      }
      setSubmitError(null);
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setSubmitError(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting || loading) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payloadLines: CreateQuotationLineInput[] = lines.map((l) => ({
        source_product_id: l.source_product_id,
        variant_id: l.variant_id || null,
        quantity: l.quantity,
        unit_price_minor: rupeesToPaise(l.unitPriceInput) ?? 0,
        tax_rule_id: l.tax_rule_id || null,
        description: l.description.trim() || null,
      }));

      const input: CreateQuotationInput = {
        account_id: selectedAccountId,
        template_id: selectedTemplateId || null,
        plan_id: selectedTemplate?.plan_id || null,
        validity_days: validityDays > 0 ? validityDays : 30,
        terms: terms.trim() || null,
        lines: payloadLines,
      };

      await onSubmit(input);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to create quotation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-quotation-title"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 id="create-quotation-title" className="text-lg font-bold text-gray-900">
            Create New Quotation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-lg leading-none"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Step Indicator */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span
                className={`px-2.5 py-1 rounded-full ${
                  step === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                1. Customer & Template
              </span>
              <span className="text-gray-300">/</span>
              <span
                className={`px-2.5 py-1 rounded-full ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                2. Review Lines
              </span>
              <span className="text-gray-300">/</span>
              <span
                className={`px-2.5 py-1 rounded-full ${
                  step === 3 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                3. Review & Submit
              </span>
            </div>
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {submitError}
            </div>
          )}

          {loadError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded">
              {loadError}
            </div>
          )}

          {/* STEP 1: Customer & Template Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Select
                  id="quote-customer"
                  label="Select Customer *"
                  value={selectedAccountId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAccountId(e.target.value)}
                  disabled={dataLoading}
                  className="w-full"
                >
                  <option value="">-- Choose Customer Account --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name} ({c.billing_email})
                    </option>
                  ))}
                </Select>
                {customers.length === 0 && !dataLoading && (
                  <p className="text-xs text-gray-500 mt-1">
                    No customers found. You can enter or mock customer accounts in the customer directory.
                  </p>
                )}
              </div>

              <div>
                <Select
                  id="quote-template"
                  label="Start from Quotation Template (Optional)"
                  value={selectedTemplateId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => handleTemplateChange(e.target.value)}
                  disabled={dataLoading}
                  className="w-full"
                >
                  <option value="">-- No template (Create blank quotation) --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.lines.length} lines, {t.validity_days} days validity)
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="quote-validity"
                    label="Validity Duration (Days)"
                    type="number"
                    min="1"
                    value={validityDays}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setValidityDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full"
                  />
                </div>

                <div>
                  <Input
                    id="quote-terms"
                    label="Terms & Conditions / Notes"
                    placeholder="e.g. Standard 30-day net billing terms..."
                    value={terms}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTerms(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Line Items Review & Customization */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Quotation Line Items</h4>
                  <p className="text-xs text-gray-500">
                    Review and customize product quantities and unit prices before generation.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={handleAddLine}>
                  + Add Line Item
                </Button>
              </div>

              {lines.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500">No line items in this quotation.</p>
                  <Button type="button" variant="primary" onClick={handleAddLine} className="mt-3">
                    Add First Line
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {lines.map((line, idx) => {
                    const availableVariants = variantsByProductId[line.source_product_id] || [];

                    return (
                      <div
                        key={line.id}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Product selection */}
                          <div>
                            <Select
                              label="Product"
                              value={line.source_product_id}
                              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleProductChange(idx, e.target.value)}
                              className="w-full text-xs"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {/* Variant selection */}
                          <div>
                            <Select
                              label="Variant"
                              value={line.variant_id}
                              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleVariantChange(idx, e.target.value)}
                              disabled={availableVariants.length === 0}
                              className="w-full text-xs"
                            >
                              <option value="">Default / Base</option>
                              {availableVariants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.attribute_name}: {v.attribute_value}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {/* Tax Rule */}
                          <div>
                            <Select
                              label="Tax Rule"
                              value={line.tax_rule_id}
                              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdateLine(idx, { tax_rule_id: e.target.value })}
                              className="w-full text-xs"
                            >
                              <option value="">None / Exempt</option>
                              {taxRules.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} ({(t.rate_bps / 100).toFixed(2)}%)
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          {/* Quantity */}
                          <div>
                            <Input
                              label="Qty"
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                handleUpdateLine(idx, {
                                  quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                                })
                              }
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Unit Price (INR) */}
                          <div>
                            <Input
                              label="Unit Price (₹)"
                              type="text"
                              placeholder="0.00"
                              value={line.unitPriceInput}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => handleUpdateLine(idx, { unitPriceInput: e.target.value })}
                              className="w-full text-xs"
                            />
                          </div>

                          {/* Estimated Line Subtotal */}
                          <div>
                            <span className="block text-xs font-medium text-gray-500 mb-1">Line Est.</span>
                            <div className="h-9 flex items-center text-xs font-mono font-medium text-gray-800">
                              {paiseToRupees(
                                (rupeesToPaise(line.unitPriceInput) ?? 0) * line.quantity,
                                true
                              )}
                            </div>
                          </div>

                          {/* Remove Action */}
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-red-600 hover:text-red-700 text-xs"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-800">
                <span className="font-semibold">Notice:</span> Preview totals are estimated for convenience.
                The backend billing engine is the authoritative source for final pricing, tax computation, and
                subscription linkage upon quotation generation.
              </div>

              {/* Summary Information */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                <div>
                  <span className="font-semibold text-gray-500">Customer:</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {selectedCustomer?.display_name || selectedAccountId}
                  </p>
                  {selectedCustomer?.billing_email && (
                    <p className="text-gray-500">{selectedCustomer.billing_email}</p>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Validity:</span>
                  <p className="font-medium text-gray-900 mt-0.5">{validityDays} days from issue</p>
                </div>
                {selectedTemplate && (
                  <div className="col-span-2">
                    <span className="font-semibold text-gray-500">Template Used:</span>
                    <p className="font-medium text-gray-900 mt-0.5">{selectedTemplate.name}</p>
                  </div>
                )}
              </div>

              {/* Lines Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 font-medium text-gray-500 text-left">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Est. Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {lines.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-900">{l.product_name}</span>
                          {l.variant_name && <span className="text-gray-500 ml-1">({l.variant_name})</span>}
                        </td>
                        <td className="py-2 px-3 text-center">{l.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {paiseToRupees(rupeesToPaise(l.unitPriceInput) ?? 0, true)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {paiseToRupees((rupeesToPaise(l.unitPriceInput) ?? 0) * l.quantity, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                <div className="w-56 flex justify-between font-bold text-gray-900">
                  <span>Estimated Subtotal:</span>
                  <span className="font-mono text-indigo-700">
                    {paiseToRupees(previewSubtotalMinor, true)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Wizard Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={handlePrevStep} disabled={isSubmitting}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <Button type="button" variant="primary" onClick={handleNextStep}>
                Next: {step === 1 ? 'Review Lines' : 'Preview & Submit'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || loading}
              >
                {isSubmitting ? 'Creating Quotation...' : 'Submit Quotation'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
