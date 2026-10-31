import { Money, StatusBadge, Button } from '../../../../components/ui';
import { PRODUCT_TYPE_LABELS, type Product } from '../types';

export interface ProductTableProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

export function ProductTable({ products, onSelectProduct, onEditProduct }: ProductTableProps) {
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
                Product name
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, fontSize: '12px', color: 'var(--text-muted)' }}>
                Type
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
                Sales price
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
                Cost price
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
                Variants
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
            {products.map((product) => {
              const statusKey = product.active ? 'ACTIVE' : 'CLOSED';
              const statusLabel = product.active ? 'Active' : 'Inactive';
              const variantCount = product.variant_count ?? 0;

              return (
                <tr
                  key={product.id}
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
                    <div style={{ fontWeight: 500, color: 'var(--text)' }}>{product.name}</div>
                    {product.notes && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          maxWidth: '320px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}
                      >
                        {product.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-control)',
                        background: 'var(--surface-subtle)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Money amountMinor={product.sales_price_minor} currency={product.currency || 'INR'} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>
                    <Money amountMinor={product.cost_price_minor} currency={product.currency || 'INR'} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: variantCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: variantCount > 0 ? 550 : 400,
                      }}
                    >
                      {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge
                      status={statusKey}
                      label={statusLabel}
                      tone={product.active ? 'success' : 'neutral'}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <Button
                        variant="ghost"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onSelectProduct(product)}
                        title="View details and manage variants"
                      >
                        Variants
                      </Button>
                      <Button
                        variant="secondary"
                        style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => onEditProduct(product)}
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
