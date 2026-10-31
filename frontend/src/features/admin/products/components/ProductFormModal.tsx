import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Button, Input, Select } from '../../../../components/ui';
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  rupeesToPaise,
  paiseToRupees,
  type Product,
  type ProductType,
  type CreateProductInput,
  type UpdateProductInput,
} from '../types';

export interface ProductFormValues {
  name: string;
  type: ProductType;
  salesPriceRupees: string;
  costPriceRupees: string;
  notes: string;
  active: boolean;
}

export interface ProductFormErrors {
  name?: string;
  type?: string;
  salesPrice?: string;
  costPrice?: string;
  general?: string;
}

export function validateProductForm(values: ProductFormValues): {
  isValid: boolean;
  errors: ProductFormErrors;
  sanitized?: {
    name: string;
    type: ProductType;
    sales_price_minor: number;
    cost_price_minor: number;
    notes?: string;
    active: boolean;
  };
} {
  const errors: ProductFormErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Product name is required.';
  } else if (trimmedName.length > 200) {
    errors.name = 'Product name must be 200 characters or fewer.';
  }

  if (!values.type || !PRODUCT_TYPES.includes(values.type)) {
    errors.type = 'Product type is required.';
  }

  const salesPaise = rupeesToPaise(values.salesPriceRupees);
  if (salesPaise === null) {
    errors.salesPrice = 'Sales price must be a valid non-negative amount (e.g. 1500.00).';
  }

  const costPaise = rupeesToPaise(values.costPriceRupees);
  if (costPaise === null) {
    errors.costPrice = 'Cost price must be a valid non-negative amount (e.g. 0.00).';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized:
      isValid && salesPaise !== null && costPaise !== null
        ? {
            name: trimmedName,
            type: values.type,
            sales_price_minor: salesPaise,
            cost_price_minor: costPaise,
            notes: values.notes.trim() || undefined,
            active: values.active,
          }
        : undefined,
  };
}

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductInput | UpdateProductInput) => Promise<void>;
  product?: Product | null;
}

export function ProductFormModal({ isOpen, onClose, onSubmit, product }: ProductFormModalProps) {
  const isEdit = Boolean(product);

  const [values, setValues] = useState<ProductFormValues>({
    name: '',
    type: 'SOFTWARE',
    salesPriceRupees: '',
    costPriceRupees: '0.00',
    notes: '',
    active: true,
  });

  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setValues({
        name: product.name,
        type: product.type,
        salesPriceRupees: paiseToRupees(product.sales_price_minor),
        costPriceRupees: paiseToRupees(product.cost_price_minor),
        notes: product.notes ?? '',
        active: product.active,
      });
    } else {
      setValues({
        name: '',
        type: 'SOFTWARE',
        salesPriceRupees: '',
        costPriceRupees: '0.00',
        notes: '',
        active: true,
      });
    }
    setErrors({});
    setServerError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateProductForm(values);
    if (!validation.isValid || !validation.sanitized) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(validation.sanitized);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
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
          maxWidth: '540px',
          maxHeight: '90vh',
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
            <h2 id="product-modal-title" style={{ fontSize: '18px', fontWeight: 600 }}>
              {isEdit ? 'Edit product' : 'Create new product'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isEdit
                ? 'Update product details and base pricing.'
                : 'Define a product to be billed individually or attached to subscriptions.'}
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

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {serverError && (
            <div className="notice notice-error" role="alert" style={{ marginBottom: '16px' }}>
              <strong>Could not save product</strong>
              <p>{serverError}</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            <Input
              label="Product name"
              required
              placeholder="e.g. Helpdesk Pro"
              value={values.name}
              error={errors.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setValues((v) => ({ ...v, name: e.target.value }));
                if (errors.name) setErrors((err) => ({ ...err, name: undefined }));
              }}
              disabled={submitting}
            />

            <Select
              label="Product type"
              required
              value={values.type}
              error={errors.type}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                setValues((v) => ({ ...v, type: e.target.value as ProductType }));
                if (errors.type) setErrors((err) => ({ ...err, type: undefined }));
              }}
              disabled={submitting}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PRODUCT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input
                label="Sales price (INR)"
                required
                type="text"
                placeholder="1500.00"
                hint="Paise stored: integer minor units"
                value={values.salesPriceRupees}
                error={errors.salesPrice}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setValues((v) => ({ ...v, salesPriceRupees: e.target.value }));
                  if (errors.salesPrice) setErrors((err) => ({ ...err, salesPrice: undefined }));
                }}
                disabled={submitting}
              />

              <Input
                label="Cost price (INR)"
                type="text"
                placeholder="0.00"
                hint="Internal reference cost"
                value={values.costPriceRupees}
                error={errors.costPrice}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setValues((v) => ({ ...v, costPriceRupees: e.target.value }));
                  if (errors.costPrice) setErrors((err) => ({ ...err, costPrice: undefined }));
                }}
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label htmlFor="product-notes-input">
                Notes <span className="muted">(optional)</span>
              </label>
              <textarea
                id="product-notes-input"
                className="input"
                rows={3}
                placeholder="Operational notes, plan limitations, or packaging details..."
                value={values.notes}
                onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
                disabled={submitting}
                style={{ resize: 'vertical' }}
              />
            </div>

            {isEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="product-active-toggle"
                  checked={values.active}
                  onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
                  disabled={submitting}
                  style={{ width: '16px', height: '16px' }}
                />
                <label
                  htmlFor="product-active-toggle"
                  style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
                >
                  Product is active (available for quotes and subscriptions)
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
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
