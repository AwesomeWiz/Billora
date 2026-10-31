import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Button, Input, Select } from '../../../../components/ui';
import { productService } from '../../products/services/productService';
import type { Product } from '../../products/types';
import {
  TAX_SCOPES,
  TAX_SCOPE_LABELS,
  percentToBps,
  bpsToPercent,
  type TaxRule,
  type TaxScope,
  type CreateTaxInput,
  type UpdateTaxInput,
} from '../types';

export interface TaxFormValues {
  name: string;
  ratePercent: string;
  scope: TaxScope;
  productId: string;
  effectiveFrom: string;
  effectiveTo: string;
  active: boolean;
}

export interface TaxFormErrors {
  name?: string;
  ratePercent?: string;
  scope?: string;
  productId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  general?: string;
}

export function validateTaxForm(values: TaxFormValues): {
  isValid: boolean;
  errors: TaxFormErrors;
  sanitized?: CreateTaxInput;
} {
  const errors: TaxFormErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Tax rule name is required.';
  } else if (trimmedName.length > 200) {
    errors.name = 'Tax name must be 200 characters or fewer.';
  }

  const rateBps = percentToBps(values.ratePercent);
  if (rateBps === null) {
    errors.ratePercent = 'Tax rate must be a valid percentage between 0% and 100% (e.g. 18.00).';
  } else if (rateBps < 0 || rateBps > 10000) {
    errors.ratePercent = 'Tax rate must be between 0 and 10000 basis points (0% to 100%).';
  }

  if (!values.scope || !TAX_SCOPES.includes(values.scope)) {
    errors.scope = 'Please select a valid tax scope.';
  }

  if (values.scope === 'PRODUCT') {
    if (!values.productId?.trim()) {
      errors.productId = 'Product selection is required for product-specific tax rules.';
    }
  }

  if (values.effectiveFrom?.trim() && !/^\d{4}-\d{2}-\d{2}/.test(values.effectiveFrom)) {
    errors.effectiveFrom = 'Please enter a valid date in YYYY-MM-DD format.';
  }

  if (values.effectiveTo?.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(values.effectiveTo)) {
      errors.effectiveTo = 'Please enter a valid date in YYYY-MM-DD format.';
    } else if (values.effectiveFrom && values.effectiveTo < values.effectiveFrom) {
      errors.effectiveTo = 'Effective end date cannot precede start date.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized:
      isValid && rateBps !== null
        ? {
            name: trimmedName,
            rate_bps: rateBps,
            scope: values.scope,
            product_id: values.scope === 'PRODUCT' ? values.productId.trim() || null : null,
            effective_from: values.effectiveFrom.trim() || null,
            effective_to: values.effectiveTo.trim() || null,
            active: values.active,
          }
        : undefined,
  };
}

export interface TaxFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaxInput | UpdateTaxInput) => Promise<void>;
  tax?: TaxRule | null;
}

export function TaxFormModal({ isOpen, onClose, onSubmit, tax }: TaxFormModalProps) {
  const isEdit = Boolean(tax);

  const [values, setValues] = useState<TaxFormValues>({
    name: '',
    ratePercent: '18',
    scope: 'GLOBAL',
    productId: '',
    effectiveFrom: '',
    effectiveTo: '',
    active: true,
  });

  const [errors, setErrors] = useState<TaxFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Products list for PRODUCT scope dropdown
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (tax) {
      setValues({
        name: tax.name,
        ratePercent: bpsToPercent(tax.rate_bps, false),
        scope: tax.scope,
        productId: tax.product_id || '',
        effectiveFrom: tax.effective_from ? tax.effective_from.slice(0, 10) : '',
        effectiveTo: tax.effective_to ? tax.effective_to.slice(0, 10) : '',
        active: tax.active,
      });
    } else {
      setValues({
        name: '',
        ratePercent: '18',
        scope: 'GLOBAL',
        productId: '',
        effectiveFrom: '',
        effectiveTo: '',
        active: true,
      });
    }
    setErrors({});
    setServerError(null);
  }, [tax, isOpen]);

  // Load products when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingProducts(true);

    productService
      .listProducts({ page_size: 100 })
      .then((res) => {
        if (!isMounted) return;
        setProducts(res.items);
      })
      .catch(() => {
        // Fallback or offline state
        if (!isMounted) return;
        setProducts([]);
      })
      .finally(() => {
        if (isMounted) setLoadingProducts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateTaxForm(values);
    if (!validation.isValid || !validation.sanitized) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(validation.sanitized);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save tax rule. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const parsedBps = percentToBps(values.ratePercent) ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tax-modal-title"
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
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-dialog)',
          boxShadow: 'var(--shadow-dialog)',
          border: '1px solid var(--border)',
          padding: 0,
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 id="tax-modal-title" style={{ fontSize: '18px', fontWeight: 600 }}>
              {isEdit ? 'Edit tax rule' : 'Create new tax rule'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isEdit
                ? 'Update tax percentage, basis points, applicable product scope, or effective dates.'
                : 'Configure statutory or regional tax rates for subscription invoice line items.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
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

        <form onSubmit={handleSubmit} noValidate style={{ padding: '24px' }}>
          {serverError && (
            <div className="notice notice-error" role="alert" style={{ marginBottom: '16px' }}>
              <strong>Could not save tax rule</strong>
              <p>{serverError}</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            <Input
              label="Tax name"
              required
              placeholder="e.g. GST 18% or VAT Standard"
              value={values.name}
              error={errors.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setValues((v) => ({ ...v, name: e.target.value }));
                if (errors.name) setErrors((err) => ({ ...err, name: undefined }));
              }}
              disabled={submitting}
            />

            <div>
              <Input
                label="Tax rate (%)"
                required
                type="text"
                placeholder="18.00"
                hint={`Stored as ${parsedBps} integer basis points (bps)`}
                value={values.ratePercent}
                error={errors.ratePercent}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setValues((v) => ({ ...v, ratePercent: e.target.value }));
                  if (errors.ratePercent) setErrors((err) => ({ ...err, ratePercent: undefined }));
                }}
                disabled={submitting}
              />
            </div>

            <Select
              label="Tax scope"
              required
              value={values.scope}
              error={errors.scope}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const nextScope = e.target.value as TaxScope;
                setValues((v) => ({ ...v, scope: nextScope }));
                if (errors.scope) setErrors((err) => ({ ...err, scope: undefined }));
              }}
              disabled={submitting}
            >
              {TAX_SCOPES.map((sc) => (
                <option key={sc} value={sc}>
                  {TAX_SCOPE_LABELS[sc]}
                </option>
              ))}
            </Select>

            {values.scope === 'PRODUCT' && (
              <Select
                label="Target product"
                required
                value={values.productId}
                error={errors.productId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setValues((v) => ({ ...v, productId: e.target.value }));
                  if (errors.productId) setErrors((err) => ({ ...err, productId: undefined }));
                }}
                disabled={submitting || loadingProducts}
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </Select>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Input
                label="Effective from"
                type="date"
                hint="Start date (optional)"
                value={values.effectiveFrom}
                error={errors.effectiveFrom}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setValues((v) => ({ ...v, effectiveFrom: e.target.value }));
                  if (errors.effectiveFrom) setErrors((err) => ({ ...err, effectiveFrom: undefined }));
                }}
                disabled={submitting}
              />

              <Input
                label="Effective to"
                type="date"
                hint="End date (optional)"
                value={values.effectiveTo}
                error={errors.effectiveTo}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setValues((v) => ({ ...v, effectiveTo: e.target.value }));
                  if (errors.effectiveTo) setErrors((err) => ({ ...err, effectiveTo: undefined }));
                }}
                disabled={submitting}
              />
            </div>

            {isEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="tax-active-toggle"
                  checked={values.active}
                  onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
                  disabled={submitting}
                  style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="tax-active-toggle" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  Tax rule is active (available for billing engine calculation)
                </label>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '28px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {isEdit ? 'Save changes' : 'Create tax rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
