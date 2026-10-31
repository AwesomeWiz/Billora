import { Money } from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import {
  BILLING_INTERVAL_LABELS,
  type BillingInterval,
  type PlanLifecyclePolicies,
} from '../types';

export interface PlanBillingSummaryProps {
  name: string;
  baseFeeMinor: number;
  currency: string;
  billPlanBaseFee: boolean;
  billingInterval: BillingInterval;
  minQuantity: number;
  availableFrom: string;
  availableTo?: string;
  lifecycle: PlanLifecyclePolicies;
}

export function PlanBillingSummary({
  name,
  baseFeeMinor,
  currency,
  billPlanBaseFee,
  billingInterval,
  minQuantity,
  availableFrom,
  availableTo,
  lifecycle,
}: PlanBillingSummaryProps) {
  const fromFormatted = availableFrom ? formatDate(availableFrom) : 'Immediate';
  const toFormatted = availableTo ? formatDate(availableTo) : 'Indefinite';

  return (
    <div
      className="card"
      style={{
        backgroundColor: 'var(--surface-subtle)',
        border: '1px solid var(--border-strong)',
        padding: '20px',
        borderRadius: 'var(--radius-card)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '10px',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Billing Summary</h3>
        <span
          className="subtle-label"
          style={{
            backgroundColor: 'var(--warning-soft)',
            color: 'var(--warning)',
            borderColor: 'var(--warning)',
            fontWeight: 600,
          }}
        >
          Preview — Not saved
        </span>
      </div>

      <div style={{ display: 'grid', gap: '14px', fontSize: '13px' }}>
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Plan identifier
          </span>
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
            {name.trim() || 'Untitled Plan'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configured Base Fee
            </span>
            <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '2px' }}>
              <Money amountMinor={baseFeeMinor} currency={currency} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({baseFeeMinor} minor units)
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Billing Frequency
            </span>
            <div style={{ fontWeight: 600, fontSize: '15px', marginTop: '2px' }}>
              {BILLING_INTERVAL_LABELS[billingInterval]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Charged per cycle
            </div>
          </div>
        </div>

        {/* Explicit Base Fee Invoicing Behavior */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-control)',
            backgroundColor: billPlanBaseFee ? 'var(--info-soft)' : 'var(--surface)',
            border: `1px solid ${billPlanBaseFee ? 'var(--info)' : 'var(--border)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: billPlanBaseFee ? 'var(--info)' : 'var(--text-muted)',
              }}
            />
            <strong style={{ fontSize: '12px', color: billPlanBaseFee ? 'var(--info)' : 'var(--text)' }}>
              {billPlanBaseFee ? 'Plan Base Fee Will Be Invoiced' : 'Informational Base Fee Only'}
            </strong>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', margin: 0, lineHeight: 1.5 }}>
            {billPlanBaseFee
              ? `An explicit recurring line of ${baseFeeMinor} minor units will be added to each subscription invoice.`
              : 'The base fee is not billed on invoices; recurring invoices will charge solely for itemized subscription line items.'}
          </p>
        </div>

        {/* Volume & Availability */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Minimum Volume
            </span>
            <div style={{ fontWeight: 500 }}>
              {minQuantity} {minQuantity === 1 ? 'unit' : 'units'} minimum
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Availability Window
            </span>
            <div style={{ fontSize: '12px' }}>
              {fromFormatted} → {toFormatted}
            </div>
          </div>
        </div>

        {/* Lifecycle Policies */}
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Subscription Policies
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: lifecycle.auto_close ? 'var(--surface)' : 'transparent',
                border: '1px solid var(--border)',
                color: lifecycle.auto_close ? 'var(--text)' : 'var(--text-subtle)',
              }}
            >
              Auto-close: {lifecycle.auto_close ? 'Enabled' : 'Disabled'}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: lifecycle.can_pause ? 'var(--surface)' : 'transparent',
                border: '1px solid var(--border)',
                color: lifecycle.can_pause ? 'var(--text)' : 'var(--text-subtle)',
              }}
            >
              Pause: {lifecycle.can_pause ? 'Allowed' : 'Disallowed'}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: lifecycle.can_renew ? 'var(--surface)' : 'transparent',
                border: '1px solid var(--border)',
                color: lifecycle.can_renew ? 'var(--text)' : 'var(--text-subtle)',
              }}
            >
              Renew: {lifecycle.can_renew ? 'Allowed' : 'Disallowed'}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: lifecycle.can_close_early ? 'var(--surface)' : 'transparent',
                border: '1px solid var(--border)',
                color: lifecycle.can_close_early ? 'var(--text)' : 'var(--text-subtle)',
              }}
            >
              Early-close: {lifecycle.can_close_early ? 'Allowed' : 'Disallowed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
