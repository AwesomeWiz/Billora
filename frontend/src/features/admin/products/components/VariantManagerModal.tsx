import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Button, Input, Money, StatusBadge, LoadingSkeleton } from '../../../../components/ui';
import { formatMoney } from '../../../../lib/format';
import { productService } from '../services/productService';
import {
  calculateResolvedPrice,
  rupeeDeltaToPaise,
  paiseToRupees,
  type Product,
  type ProductVariant,
  type CreateVariantInput,
  type UpdateVariantInput,
} from '../types';

export interface VariantManagerModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onVariantsUpdated?: () => void;
}

interface VariantFormValues {
  attributeName: string;
  attributeValue: string;
  priceDeltaRupees: string;
  active: boolean;
}

interface VariantFormErrors {
  attributeName?: string;
  attributeValue?: string;
  priceDelta?: string;
}

export function VariantManagerModal({
  isOpen,
  product,
  onClose,
  onVariantsUpdated,
}: VariantManagerModalProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formValues, setFormValues] = useState<VariantFormValues>({
    attributeName: '',
    attributeValue: '',
    priceDeltaRupees: '+0.00',
    active: true,
  });
  const [formErrors, setFormErrors] = useState<VariantFormErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const basePriceMinor = product?.sales_price_minor ?? 0;
  const currency = product?.currency || 'INR';

  // Load variants when modal opens or product changes
  useEffect(() => {
    if (!isOpen || !product) {
      setVariants([]);
      setIsFormOpen(false);
      setEditingVariant(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    productService
      .listVariants(product.id)
      .then((items) => {
        if (!isMounted) return;
        setVariants(items);
      })
      .catch((err) => {
        if (!isMounted) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not load variants from API. Backend endpoint may be pending.';
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const startCreate = () => {
    setEditingVariant(null);
    setFormValues({
      attributeName: '',
      attributeValue: '',
      priceDeltaRupees: '+0.00',
      active: true,
    });
    setFormErrors({});
    setFormServerError(null);
    setIsFormOpen(true);
  };

  const startEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    const sign = variant.price_delta_minor >= 0 ? '+' : '';
    setFormValues({
      attributeName: variant.attribute_name,
      attributeValue: variant.attribute_value,
      priceDeltaRupees: `${sign}${paiseToRupees(variant.price_delta_minor)}`,
      active: variant.active,
    });
    setFormErrors({});
    setFormServerError(null);
    setIsFormOpen(true);
  };

  const cancelForm = () => {
    setIsFormOpen(false);
    setEditingVariant(null);
    setFormErrors({});
    setFormServerError(null);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormServerError(null);

    const errs: VariantFormErrors = {};
    const trimmedAttr = formValues.attributeName.trim();
    const trimmedVal = formValues.attributeValue.trim();

    if (!trimmedAttr) {
      errs.attributeName = 'Attribute name is required (e.g. brand, color).';
    }
    if (!trimmedVal) {
      errs.attributeValue = 'Attribute value is required (e.g. Odoo, Enterprise).';
    }

    const deltaPaise = rupeeDeltaToPaise(formValues.priceDeltaRupees);
    if (deltaPaise === null) {
      errs.priceDelta =
        'Adjustment must be a valid signed number in rupees (e.g. +560.00 or -100.00).';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingVariant) {
        const updateInput: UpdateVariantInput = {
          attribute_name: trimmedAttr,
          attribute_value: trimmedVal,
          price_delta_minor: deltaPaise!,
          active: formValues.active,
        };
        const updated = await productService.updateVariant(
          product.id,
          editingVariant.id,
          updateInput,
        );
        setVariants((prev) =>
          prev.map((v) => (v.id === editingVariant.id ? { ...v, ...updated } : v)),
        );
      } else {
        const createInput: CreateVariantInput = {
          attribute_name: trimmedAttr,
          attribute_value: trimmedVal,
          price_delta_minor: deltaPaise!,
          active: formValues.active,
        };
        const created = await productService.createVariant(product.id, createInput);
        setVariants((prev) => [...prev, created]);
      }

      setIsFormOpen(false);
      setEditingVariant(null);
      onVariantsUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save variant.';
      setFormServerError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (variant: ProductVariant) => {
    if (!window.confirm(`Are you sure you want to remove variant "${variant.attribute_name}: ${variant.attribute_value}"?`)) {
      return;
    }

    try {
      await productService.deleteVariant(product.id, variant.id);
      setVariants((prev) => prev.filter((v) => v.id !== variant.id));
      onVariantsUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete variant.');
    }
  };

  // Preview calculation for form
  const parsedFormDelta = rupeeDeltaToPaise(formValues.priceDeltaRupees) ?? 0;
  const previewResolvedPrice = calculateResolvedPrice(basePriceMinor, parsedFormDelta);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="variants-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--overlay)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !formSubmitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-dialog)',
          boxShadow: 'var(--shadow-dialog)',
          border: '1px solid var(--border)',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 id="variants-modal-title" style={{ fontSize: '18px', fontWeight: 600 }}>
                Variants: {product.name}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Base sales price:{' '}
              <strong style={{ color: 'var(--text)' }}>
                <Money amountMinor={basePriceMinor} currency={currency} />
              </strong>{' '}
              ({basePriceMinor} paise)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div className="notice notice-warning" role="alert" style={{ marginBottom: '16px' }}>
              <strong>Variant service status</strong>
              <p>{error}</p>
            </div>
          )}

          {/* Pricing Formula Callout */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              marginBottom: '20px',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              Pricing Formula & Spec Verification:
            </div>
            <div style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Resolved unit price = Base sales price + Variant price adjustment
              <br />
              <span style={{ color: 'var(--primary)', fontWeight: 550 }}>
                Example (Helpdesk Pro + Odoo brand):
              </span>{' '}
              ₹1,500.00 (150,000 paise) + ₹560.00 (56,000 paise) ={' '}
              <strong>₹2,060.00 (206,000 paise)</strong>
            </div>
          </div>

          {/* Variant Form Section */}
          {isFormOpen && (
            <form
              onSubmit={handleFormSubmit}
              noValidate
              style={{
                padding: '20px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-card)',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>
                {editingVariant ? 'Edit variant' : 'Add new variant'}
              </h3>

              {formServerError && (
                <div className="notice notice-error" role="alert" style={{ marginBottom: '12px' }}>
                  <p>{formServerError}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Input
                  label="Attribute name"
                  required
                  placeholder="e.g. brand"
                  value={formValues.attributeName}
                  error={formErrors.attributeName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormValues((v) => ({ ...v, attributeName: e.target.value }))
                  }
                  disabled={formSubmitting}
                />
                <Input
                  label="Attribute value"
                  required
                  placeholder="e.g. Odoo"
                  value={formValues.attributeValue}
                  error={formErrors.attributeValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormValues((v) => ({ ...v, attributeValue: e.target.value }))
                  }
                  disabled={formSubmitting}
                />
              </div>

              <div style={{ marginTop: '14px' }}>
                <Input
                  label="Price adjustment (INR)"
                  required
                  type="text"
                  placeholder="+560.00 or -50.00"
                  hint="Positive increases price; negative discounts it"
                  value={formValues.priceDeltaRupees}
                  error={formErrors.priceDelta}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormValues((v) => ({ ...v, priceDeltaRupees: e.target.value }))
                  }
                  disabled={formSubmitting}
                />
              </div>

              {/* Live Preview Box */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-control)',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  Calculation preview:{' '}
                  <span>
                    <Money amountMinor={basePriceMinor} currency={currency} /> (Base) +{' '}
                    <Money amountMinor={parsedFormDelta} currency={currency} /> (Adjustment)
                  </span>
                </span>
                <strong
                  data-testid="live-resolved-preview"
                  style={{ color: 'var(--primary)', fontSize: '13px' }}
                >
                  = <Money amountMinor={previewResolvedPrice} currency={currency} />
                </strong>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '16px',
                }}
              >
                <Button variant="ghost" onClick={cancelForm} disabled={formSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={formSubmitting}>
                  {editingVariant ? 'Update variant' : 'Add variant'}
                </Button>
              </div>
            </form>
          )}

          {/* Action Bar */}
          {!isFormOpen && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                Configured variants ({variants.length})
              </span>
              <Button variant="secondary" onClick={startCreate}>
                + Add variant
              </Button>
            </div>
          )}

          {/* Variants Table or Loading / Empty */}
          {loading ? (
            <LoadingSkeleton lines={3} label="Loading variants..." />
          ) : variants.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <p>No variants configured for this product.</p>
              {!isFormOpen && (
                <Button
                  variant="primary"
                  onClick={startCreate}
                  style={{ marginTop: '12px', minHeight: '34px', fontSize: '12px' }}
                >
                  Configure first variant
                </Button>
              )}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                      Attribute
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                      Value
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                      Adjustment
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                      Resolved unit price
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                      Status
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const resolvedPrice = calculateResolvedPrice(basePriceMinor, v.price_delta_minor);
                    const isPositiveDelta = v.price_delta_minor >= 0;

                    return (
                      <tr
                        key={v.id}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                          <code>{v.attribute_name}</code>
                        </td>
                        <td style={{ padding: '10px 14px' }}>{v.attribute_value}</td>
                        <td
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            color: isPositiveDelta ? 'var(--text)' : 'var(--danger)',
                          }}
                        >
                          <span className="tabular-nums">
                            {isPositiveDelta ? '+' : ''}
                            {formatMoney(v.price_delta_minor, currency)}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: 'var(--text)',
                          }}
                        >
                          <Money amountMinor={resolvedPrice} currency={currency} />
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <StatusBadge
                            status={v.active ? 'ACTIVE' : 'CLOSED'}
                            label={v.active ? 'Active' : 'Inactive'}
                            tone={v.active ? 'success' : 'neutral'}
                          />
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <Button
                              variant="ghost"
                              style={{ minHeight: '28px', padding: '2px 8px', fontSize: '12px' }}
                              onClick={() => startEdit(v)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              style={{
                                minHeight: '28px',
                                padding: '2px 8px',
                                fontSize: '12px',
                                color: 'var(--danger)',
                              }}
                              onClick={() => void handleDelete(v)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
