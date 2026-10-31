import { useState } from 'react';
import { PageHeader, Button, LoadingSkeleton, EmptyState, ErrorState } from '../../../../components/ui';
import { useProducts } from '../hooks/useProducts';
import { ProductFilters } from '../components/ProductFilters';
import { ProductTable } from '../components/ProductTable';
import type { Product } from '../types';

export function ProductsPage() {
  const {
    products,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh,
  } = useProducts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const hasFilterActive = Boolean(params.search?.trim() || params.type || params.active);

  return (
    <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Products & Variants"
        description="Configure subscription catalog items, base pricing, and selectable attribute variants."
        breadcrumbs={[
          { label: 'Admin', href: '/app/overview' },
          { label: 'Catalog' },
          { label: 'Products' },
        ]}
        action={
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={isEndpointUnavailable}
          >
            + New product
          </Button>
        }
      />

      {isEndpointUnavailable && (
        <div className="notice notice-warning" role="alert" style={{ marginBottom: '24px' }}>
          <strong>Catalog backend endpoint not mounted</strong>
          <p>
            The backend catalog module (<code>GET /api/products</code>) has not yet been deployed
            to the API server. This UI is implemented against the system architecture specifications
            and will automatically link as soon as backend catalog services are deployed.
          </p>
          <Button
            variant="secondary"
            onClick={() => void refresh()}
            style={{ marginTop: '8px', minHeight: '32px', fontSize: '12px' }}
          >
            Check connection again
          </Button>
        </div>
      )}

      <ProductFilters
        params={params}
        onChange={setParams}
        disabled={loading && !products.length}
      />

      {loading && !products.length ? (
        <div className="card" style={{ padding: '32px' }}>
          <LoadingSkeleton lines={6} label="Loading products..." />
        </div>
      ) : error && !isEndpointUnavailable ? (
        <div className="card" style={{ padding: '24px' }}>
          <ErrorState
            title="Failed to load catalog products"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : products.length === 0 ? (
        <div className="card">
          <EmptyState
            title={hasFilterActive ? 'No matching products' : 'No products in catalog'}
            description={
              hasFilterActive
                ? 'Try adjusting your search keywords or clear the filters to view all products.'
                : isEndpointUnavailable
                  ? 'Products cannot be retrieved until the backend endpoint /api/products is active.'
                  : 'Start by creating your first billable product or subscription add-on.'
            }
            action={
              hasFilterActive ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setParams((prev) => ({
                      ...prev,
                      search: '',
                      type: '',
                      active: '',
                      page: 1,
                    }))
                  }
                >
                  Reset filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setIsCreating(true)}
                  disabled={isEndpointUnavailable}
                >
                  Create product
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              Showing {products.length} {products.length === 1 ? 'product' : 'products'}
              {total > products.length ? ` of ${total}` : ''}
            </span>
          </div>

          <ProductTable
            products={products}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onEditProduct={(p) => setEditingProduct(p)}
          />
        </>
      )}

      {/* Placeholders for modal/drawers to be connected in milestones 3 & 4 */}
      {isCreating && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-title"
          style={{ display: 'none' }}
        >
          <h2 id="create-product-title">Create product</h2>
          <button onClick={() => setIsCreating(false)}>Close</button>
        </div>
      )}
      {editingProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
          style={{ display: 'none' }}
        >
          <h2 id="edit-product-title">Edit product</h2>
          <button onClick={() => setEditingProduct(null)}>Close</button>
        </div>
      )}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="variants-title"
          style={{ display: 'none' }}
        >
          <h2 id="variants-title">Variants</h2>
          <button onClick={() => setSelectedProduct(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
