import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Button, Input, Select } from '../../../../components/ui';
import { rupeesToPaise, paiseToRupees } from '../../products/types';
import { PlanBillingSummary } from './PlanBillingSummary';
import {
  BILLING_INTERVALS,
  BILLING_INTERVAL_LABELS,
  type BillingInterval,
  type Plan,
  type CreatePlanInput,
  type UpdatePlanInput,
  type PlanLifecyclePolicies,
} from '../types';

export interface PlanFormValues {
  name: string;
  baseFeeRupees: string;
  currency: string;
  billPlanBaseFee: boolean;
  billingInterval: BillingInterval;
  minQuantity: string;
  availableFrom: string;
  availableTo: string;
  lifecycle: PlanLifecyclePolicies;
  active: boolean;
}

export interface PlanFormErrors {
  name?: string;
  baseFee?: string;
  minQuantity?: string;
  availableFrom?: string;
  availableTo?: string;
  general?: string;
}

export function validatePlanForm(values: PlanFormValues): {
  isValid: boolean;
  errors: PlanFormErrors;
  sanitized?: CreatePlanInput;
} {
  const errors: PlanFormErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Plan name is required.';
  } else if (trimmedName.length > 200) {
    errors.name = 'Plan name must be 200 characters or fewer.';
  }

  const basePaise = rupeesToPaise(values.baseFeeRupees);
  if (basePaise === null) {
    errors.baseFee = 'Base fee must be a valid non-negative amount (e.g. 1500.00).';
  }

  const minQtyNum = parseInt(values.minQuantity, 10);
  if (isNaN(minQtyNum) || minQtyNum < 1) {
    errors.minQuantity = 'Minimum quantity must be an integer of at least 1.';
  }

  if (!values.availableFrom?.trim()) {
    errors.availableFrom = 'Availability start date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}/.test(values.availableFrom)) {
    errors.availableFrom = 'Please enter a valid date in YYYY-MM-DD format.';
  }

  if (values.availableTo?.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(values.availableTo)) {
      errors.availableTo = 'Please enter a valid date in YYYY-MM-DD format.';
    } else if (values.availableFrom && values.availableTo < values.availableFrom) {
      errors.availableTo = 'End date cannot precede the start date.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized:
      isValid && basePaise !== null
        ? {
            name: trimmedName,
            base_fee_minor: basePaise,
            bill_plan_base_fee: values.billPlanBaseFee,
            billing_interval: values.billingInterval,
            min_quantity: minQtyNum,
            available_from: values.availableFrom.trim(),
            available_to: values.availableTo.trim() || null,
            currency: values.currency || 'INR',
            auto_close: values.lifecycle.auto_close,
            can_close_early: values.lifecycle.can_close_early,
            can_pause: values.lifecycle.can_pause,
            can_renew: values.lifecycle.can_renew,
            active: values.active,
          }
        : undefined,
  };
}

export interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlanInput | UpdatePlanInput) => Promise<void>;
  plan?: Plan | null;
}

export function PlanFormModal({ isOpen, onClose, onSubmit, plan }: PlanFormModalProps) {
  const isEdit = Boolean(plan);

  const [values, setValues] = useState<PlanFormValues>({
    name: '',
    baseFeeRupees: '0.00',
    currency: 'INR',
    billPlanBaseFee: true,
    billingInterval: 'MONTHLY',
    minQuantity: '1',
    availableFrom: new Date().toISOString().slice(0, 10),
    availableTo: '',
    lifecycle: {
      auto_close: true,
      can_close_early: true,
      can_pause: true,
      can_renew: true,
    },
    active: true,
  });

  const [errors, setErrors] = useState<PlanFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (plan) {
      setValues({
        name: plan.name,
        baseFeeRupees: paiseToRupees(plan.base_fee_minor),
        currency: plan.currency || 'INR',
        billPlanBaseFee: plan.bill_plan_base_fee,
        billingInterval: plan.billing_interval,
        minQuantity: String(plan.min_quantity),
        availableFrom: plan.available_from ? plan.available_from.slice(0, 10) : '',
        availableTo: plan.available_to ? plan.available_to.slice(0, 10) : '',
        lifecycle: {
          auto_close: plan.auto_close,
          can_close_early: plan.can_close_early,
          can_pause: plan.can_pause,
          can_renew: plan.can_renew,
        },
        active: plan.active,
      });
    } else {
      setValues({
        name: '',
        baseFeeRupees: '0.00',
        currency: 'INR',
        billPlanBaseFee: true,
        billingInterval: 'MONTHLY',
        minQuantity: '1',
        availableFrom: new Date().toISOString().slice(0, 10),
        availableTo: '',
        lifecycle: {
          auto_close: true,
          can_close_early: true,
          can_pause: true,
          can_renew: true,
        },
        active: true,
      });
    }
    setErrors({});
    setServerError(null);
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validatePlanForm(values);
    if (!validation.isValid || !validation.sanitized) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(validation.sanitized);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save plan. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentBasePaise = rupeesToPaise(values.baseFeeRupees) ?? 0;
  const currentMinQty = parseInt(values.minQuantity, 10) || 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-modal-title"
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
          maxWidth: '900px',
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
            <h2 id="plan-modal-title" style={{ fontSize: '18px', fontWeight: 600 }}>
              {isEdit ? 'Edit subscription plan' : 'Create subscription plan'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isEdit
                ? 'Update billing interval, fees, minimum quantities and lifecycle policies.'
                : 'Define pricing terms, billing frequencies, and subscription lifecycle rules.'}
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
              <strong>Could not save plan</strong>
              <p>{serverError}</p>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Left: Form Fields */}
            <div style={{ display: 'grid', gap: '16px' }}>
              <Input
                label="Plan name"
                required
                placeholder="e.g. Enterprise Monthly"
                value={values.name}
                error={errors.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setValues((v) => ({ ...v, name: e.target.value }));
                  if (errors.name) setErrors((err) => ({ ...err, name: undefined }));
                }}
                disabled={submitting}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                <Input
                  label={`Base fee (${values.currency})`}
                  required
                  type="text"
                  placeholder="1500.00"
                  hint="Paise: integer minor units"
                  value={values.baseFeeRupees}
                  error={errors.baseFee}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValues((v) => ({ ...v, baseFeeRupees: e.target.value }));
                    if (errors.baseFee) setErrors((err) => ({ ...err, baseFee: undefined }));
                  }}
                  disabled={submitting}
                />

                <Select
                  label="Currency"
                  value={values.currency}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setValues((v) => ({ ...v, currency: e.target.value }))
                  }
                  disabled={submitting}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </Select>
              </div>

              {/* Bill Plan Base Fee Toggle */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="plan-bill-base-fee"
                    checked={values.billPlanBaseFee}
                    onChange={(e) => setValues((v) => ({ ...v, billPlanBaseFee: e.target.checked }))}
                    disabled={submitting}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="plan-bill-base-fee" style={{ fontWeight: 550, cursor: 'pointer', fontSize: '13px' }}>
                    Include plan base fee as a recurring invoice charge
                  </label>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', marginLeft: '26px' }}>
                  {values.billPlanBaseFee
                    ? 'Invoices will include an explicit recurring charge for this base fee in addition to itemized line products.'
                    : 'The base fee is display-only/informational. Invoices will charge only for itemized products.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Select
                  label="Billing interval"
                  required
                  value={values.billingInterval}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setValues((v) => ({ ...v, billingInterval: e.target.value as BillingInterval }))
                  }
                  disabled={submitting}
                >
                  {BILLING_INTERVALS.map((int) => (
                    <option key={int} value={int}>
                      {BILLING_INTERVAL_LABELS[int]}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Minimum quantity"
                  required
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  hint="Subscription must meet this minimum"
                  value={values.minQuantity}
                  error={errors.minQuantity}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValues((v) => ({ ...v, minQuantity: e.target.value }));
                    if (errors.minQuantity) setErrors((err) => ({ ...err, minQuantity: undefined }));
                  }}
                  disabled={submitting}
                />
              </div>

              {/* Availability Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Input
                  label="Available from"
                  required
                  type="date"
                  value={values.availableFrom}
                  error={errors.availableFrom}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValues((v) => ({ ...v, availableFrom: e.target.value }));
                    if (errors.availableFrom) setErrors((err) => ({ ...err, availableFrom: undefined }));
                  }}
                  disabled={submitting}
                />

                <Input
                  label="Available to (optional)"
                  type="date"
                  hint="Leave empty for indefinite"
                  value={values.availableTo}
                  error={errors.availableTo}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setValues((v) => ({ ...v, availableTo: e.target.value }));
                    if (errors.availableTo) setErrors((err) => ({ ...err, availableTo: undefined }));
                  }}
                  disabled={submitting}
                />
              </div>

              {/* Lifecycle Policy Toggles */}
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  padding: '14px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                  Lifecycle Policies
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={values.lifecycle.auto_close}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          lifecycle: { ...v.lifecycle, auto_close: e.target.checked },
                        }))
                      }
                      disabled={submitting}
                    />
                    <span>Auto-close on expiry</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={values.lifecycle.can_close_early}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          lifecycle: { ...v.lifecycle, can_close_early: e.target.checked },
                        }))
                      }
                      disabled={submitting}
                    />
                    <span>Allow early termination</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={values.lifecycle.can_pause}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          lifecycle: { ...v.lifecycle, can_pause: e.target.checked },
                        }))
                      }
                      disabled={submitting}
                    />
                    <span>Allow subscription pausing</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={values.lifecycle.can_renew}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          lifecycle: { ...v.lifecycle, can_renew: e.target.checked },
                        }))
                      }
                      disabled={submitting}
                    />
                    <span>Allow renewal upon expiry</span>
                  </label>
                </div>
              </div>

              {isEdit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="plan-active-toggle"
                    checked={values.active}
                    onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
                    disabled={submitting}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="plan-active-toggle" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                    Plan is active (available for quotations and subscriptions)
                  </label>
                </div>
              )}
            </div>

            {/* Right: Real-time Billing Summary Card */}
            <div>
              <PlanBillingSummary
                name={values.name}
                baseFeeMinor={currentBasePaise}
                currency={values.currency}
                billPlanBaseFee={values.billPlanBaseFee}
                billingInterval={values.billingInterval}
                minQuantity={currentMinQty}
                availableFrom={values.availableFrom}
                availableTo={values.availableTo}
                lifecycle={values.lifecycle}
              />
            </div>
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
              {isEdit ? 'Save changes' : 'Create plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
