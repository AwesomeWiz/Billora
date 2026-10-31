import { Money, StatusBadge, Button } from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { BILLING_INTERVAL_LABELS, type Plan } from '../types';

export interface PlanTableProps {
  plans: Plan[];
  onSelectPlan: (plan: Plan) => void;
  onEditPlan: (plan: Plan) => void;
}

export function PlanTable({ plans, onSelectPlan, onEditPlan }: PlanTableProps) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-subtle)',
              }}
            >
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Plan name
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                }}
              >
                Base fee
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Interval
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                Min qty
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Availability
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Policies
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Status
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const statusKey = plan.active ? 'ACTIVE' : 'CLOSED';
              const statusLabel = plan.active ? 'Active' : 'Inactive';
              const fromFormatted = plan.available_from ? formatDate(plan.available_from) : 'Immediate';
              const toFormatted = plan.available_to ? formatDate(plan.available_to) : 'Open';

              return (
                <tr
                  key={plan.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    height: '48px',
                    transition: 'background-color 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{plan.name}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: plan.bill_plan_base_fee ? 'var(--info)' : 'var(--text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      {plan.bill_plan_base_fee
                        ? 'Base fee billed periodically'
                        : 'Informational base fee (itemized lines only)'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Money amountMinor={plan.base_fee_minor} currency={plan.currency || 'INR'} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-control)',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {BILLING_INTERVAL_LABELS[plan.billing_interval] ?? plan.billing_interval}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 500 }}>
                    {plan.min_quantity}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{fromFormatted}</span>
                    <span style={{ margin: '0 4px' }}>→</span>
                    <span>{toFormatted}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {plan.auto_close && (
                        <span
                          title="Auto closes upon term end"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            background: 'var(--surface-subtle)',
                            borderRadius: '3px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          Auto-close
                        </span>
                      )}
                      {plan.can_pause && (
                        <span
                          title="Subscriptions can pause"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            background: 'var(--surface-subtle)',
                            borderRadius: '3px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          Pause
                        </span>
                      )}
                      {plan.can_renew && (
                        <span
                          title="Subscriptions can renew"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            background: 'var(--surface-subtle)',
                            borderRadius: '3px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          Renew
                        </span>
                      )}
                      {plan.can_close_early && (
                        <span
                          title="Early closure permitted"
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            background: 'var(--surface-subtle)',
                            borderRadius: '3px',
                            border: '1px solid var(--border)',
                          }}
                        >
                          Early-close
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge
                      status={statusKey}
                      label={statusLabel}
                      tone={plan.active ? 'success' : 'neutral'}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <Button
                        variant="ghost"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onSelectPlan(plan)}
                      >
                        Details
                      </Button>
                      <Button
                        variant="secondary"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onEditPlan(plan)}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
