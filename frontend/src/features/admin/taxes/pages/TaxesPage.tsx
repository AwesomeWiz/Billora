import { useState } from 'react';
import { PageHeader, Button, LoadingSkeleton, EmptyState, ErrorState } from '../../../../components/ui';
import { useTaxes } from '../hooks/useTaxes';
import { taxService } from '../services/taxService';
import { TaxFilters } from '../components/TaxFilters';
import { TaxTable } from '../components/TaxTable';
import { TaxFormModal } from '../components/TaxFormModal';
import type { TaxRule, CreateTaxInput, UpdateTaxInput } from '../types';

export function TaxesPage() {
  const {
    taxes,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh,
  } = useTaxes();

  const [editingTax, setEditingTax] = useState<TaxRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const hasFilterActive = Boolean(params.search?.trim() || params.scope || params.active);

  const handleCreateSubmit = async (data: CreateTaxInput | UpdateTaxInput) => {
    await taxService.createTax(data as CreateTaxInput);
    await refresh();
  };

  const handleEditSubmit = async (data: CreateTaxInput | UpdateTaxInput) => {
    if (!editingTax) return;
    await taxService.updateTax(editingTax.id, data as UpdateTaxInput);
    await refresh();
  };

  const handleToggleActive = async (tax: TaxRule) => {
    const actionWord = tax.active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionWord} the tax rule "${tax.name}"?`)) {
      return;
    }

    setIsTogglingId(tax.id);
    try {
      await taxService.toggleActive(tax.id, !tax.active);
      await refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to ${actionWord} tax rule.`);
    } finally {
      setIsTogglingId(null);
    }
  };

  return (
    <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Tax Rules"
        description="Configure applicable taxation rates, target product scopes, and effective assessment periods."
        breadcrumbs={[
          { label: 'Admin', href: '/app/overview' },
          { label: 'Catalog' },
          { label: 'Taxes' },
        ]}
        action={
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={isEndpointUnavailable}
          >
            + New tax rule
          </Button>
        }
      />

      {isEndpointUnavailable && (
        <div className="notice notice-warning" role="alert" style={{ marginBottom: '24px' }}>
          <strong>Tax rules endpoint not mounted</strong>
          <p>
            The backend tax rules module (<code>GET /api/taxes</code>) has not yet been deployed
            to the API server. This UI is ready and compliant with system architecture specifications
            and will automatically link as soon as backend tax endpoints are active.
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

      <TaxFilters
        params={params}
        onChange={setParams}
        disabled={loading && !taxes.length}
      />

      {loading && !taxes.length ? (
        <div className="card" style={{ padding: '32px' }}>
          <LoadingSkeleton lines={6} label="Loading tax rules..." />
        </div>
      ) : error && !isEndpointUnavailable ? (
        <div className="card" style={{ padding: '24px' }}>
          <ErrorState
            title="Failed to load tax rules"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : taxes.length === 0 ? (
        <div className="card">
          <EmptyState
            title={hasFilterActive ? 'No matching tax rules' : 'No tax rules configured'}
            description={
              hasFilterActive
                ? 'Try adjusting your search criteria or clearing filters to view all taxes.'
                : isEndpointUnavailable
                  ? 'Taxes cannot be retrieved until the backend endpoint /api/taxes is available.'
                  : 'Start by creating your first tax assessment rule (e.g. GST 18%).'
            }
            action={
              hasFilterActive ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setParams((prev) => ({
                      ...prev,
                      search: '',
                      scope: '',
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
                  Create tax rule
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
              Showing {taxes.length} {taxes.length === 1 ? 'tax rule' : 'tax rules'}
              {total > taxes.length ? ` of ${total}` : ''}
            </span>
          </div>

          <TaxTable
            taxes={taxes}
            onEditTax={(t) => setEditingTax(t)}
            onToggleActive={handleToggleActive}
            isTogglingId={isTogglingId}
          />
        </>
      )}

      {/* Tax Form Modal (Create) */}
      <TaxFormModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Tax Form Modal (Edit) */}
      <TaxFormModal
        isOpen={Boolean(editingTax)}
        tax={editingTax}
        onClose={() => setEditingTax(null)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}
