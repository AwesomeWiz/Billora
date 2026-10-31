import { StatusBadge, Button } from '../../../../components/ui';
import { formatDate } from '../../../../lib/format';
import { bpsToPercent, TAX_SCOPE_LABELS, type TaxRule } from '../types';

export interface TaxTableProps {
  taxes: TaxRule[];
  onEditTax: (tax: TaxRule) => void;
  onToggleActive?: (tax: TaxRule) => Promise<void>;
  isTogglingId?: string | null;
}

export function TaxTable({ taxes, onEditTax, onToggleActive, isTogglingId }: TaxTableProps) {
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
                Tax name
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
                Tax rate
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Scope & Target
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Effective period
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
            {taxes.map((tax) => {
              const statusKey = tax.active ? 'ACTIVE' : 'CLOSED';
              const statusLabel = tax.active ? 'Active' : 'Inactive';
              const fromFormatted = tax.effective_from ? formatDate(tax.effective_from) : 'Immediate';
              const toFormatted = tax.effective_to ? formatDate(tax.effective_to) : 'Indefinite';
              const isToggling = isTogglingId === tax.id;

              return (
                <tr
                  key={tax.id}
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
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{tax.name}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                      {bpsToPercent(tax.rate_bps, true)}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({tax.rate_bps} bps)
                    </div>
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
                      {TAX_SCOPE_LABELS[tax.scope] ?? tax.scope}
                    </span>
                    {tax.scope === 'PRODUCT' && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--primary)',
                          marginTop: '2px',
                          fontWeight: 500,
                        }}
                      >
                        {tax.product_name ? `Product: ${tax.product_name}` : `Product ID: ${tax.product_id}`}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{fromFormatted}</span>
                    <span style={{ margin: '0 4px' }}>→</span>
                    <span>{toFormatted}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge
                      status={statusKey}
                      label={statusLabel}
                      tone={tax.active ? 'success' : 'neutral'}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {onToggleActive && (
                        <Button
                          variant="ghost"
                          style={{
                            minHeight: '32px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            color: tax.active ? 'var(--text-muted)' : 'var(--success)',
                          }}
                          disabled={isToggling}
                          loading={isToggling}
                          onClick={() => void onToggleActive(tax)}
                        >
                          {tax.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onEditTax(tax)}
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
