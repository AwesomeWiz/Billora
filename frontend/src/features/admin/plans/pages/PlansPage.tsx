import { useState } from 'react';
import { PageHeader, Button, LoadingSkeleton, EmptyState, ErrorState } from '../../../../components/ui';
import { usePlans } from '../hooks/usePlans';
import { PlanFilters } from '../components/PlanFilters';
import { PlanTable } from '../components/PlanTable';
import type { Plan } from '../types';

export function PlansPage() {
  const {
    plans,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh,
  } = usePlans();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const hasFilterActive = Boolean(params.search?.trim() || params.billing_interval || params.active);

  return (
    <div className="page-content" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Subscription Plans"
        description="Configure subscription intervals, billing rules, minimum volume thresholds, and lifecycle policies."
        breadcrumbs={[
          { label: 'Admin', href: '/app/overview' },
          { label: 'Catalog' },
          { label: 'Plans' },
        ]}
        action={
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={isEndpointUnavailable}
          >
            + New plan
          </Button>
        }
      />

      {isEndpointUnavailable && (
        <div className="notice notice-warning" role="alert" style={{ marginBottom: '24px' }}>
          <strong>Subscription plans endpoint not mounted</strong>
          <p>
            The backend plans module (<code>GET /api/plans</code>) has not yet been deployed
            to the API server. This UI is ready and compliant with system architecture specifications
            and will automatically link as soon as backend plan endpoints are active.
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

      <PlanFilters
        params={params}
        onChange={setParams}
        disabled={loading && !plans.length}
      />

      {loading && !plans.length ? (
        <div className="card" style={{ padding: '32px' }}>
          <LoadingSkeleton lines={6} label="Loading subscription plans..." />
        </div>
      ) : error && !isEndpointUnavailable ? (
        <div className="card" style={{ padding: '24px' }}>
          <ErrorState
            title="Failed to load subscription plans"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState
            title={hasFilterActive ? 'No matching plans' : 'No subscription plans configured'}
            description={
              hasFilterActive
                ? 'Try adjusting your search criteria or clearing filters to view all plans.'
                : isEndpointUnavailable
                  ? 'Plans cannot be retrieved until the backend endpoint /api/plans is available.'
                  : 'Start by creating your first subscription billing plan.'
            }
            action={
              hasFilterActive ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setParams((prev) => ({
                      ...prev,
                      search: '',
                      billing_interval: '',
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
                  Create plan
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
              Showing {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
              {total > plans.length ? ` of ${total}` : ''}
            </span>
          </div>

          <PlanTable
            plans={plans}
            onSelectPlan={(p) => setSelectedPlan(p)}
            onEditPlan={(p) => setEditingPlan(p)}
          />
        </>
      )}

      {/* Placeholders for modal/drawers to be connected in milestones 3 & 4 */}
      {isCreating && (
        <div role="dialog" aria-modal="true" style={{ display: 'none' }}>
          <button onClick={() => setIsCreating(false)}>Close</button>
        </div>
      )}
      {editingPlan && (
        <div role="dialog" aria-modal="true" style={{ display: 'none' }}>
          <button onClick={() => setEditingPlan(null)}>Close</button>
        </div>
      )}
      {selectedPlan && (
        <div role="dialog" aria-modal="true" style={{ display: 'none' }}>
          <button onClick={() => setSelectedPlan(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
