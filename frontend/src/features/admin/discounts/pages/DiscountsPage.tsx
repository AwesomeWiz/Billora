import { useState } from 'react';
import { PageHeader, Button, LoadingSkeleton, EmptyState, ErrorState } from '../../../../components/ui';
import { useAuth } from '../../../auth/AuthProvider';
import { useDiscounts } from '../hooks/useDiscounts';
import { discountService } from '../services/discountService';
import { DiscountFilters } from '../components/DiscountFilters';
import { DiscountTable } from '../components/DiscountTable';
import { DiscountFormModal } from '../components/DiscountFormModal';
import type { DiscountRule, CreateDiscountInput, UpdateDiscountInput } from '../types';

export function DiscountsPage() {
  const { state: authState } = useAuth();
  const isAdmin = authState.status === 'authenticated' && authState.user.role === 'ADMIN';

  const {
    discounts,
    total,
    loading,
    error,
    isEndpointUnavailable,
    params,
    setParams,
    refresh,
  } = useDiscounts();

  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const hasFilterActive = Boolean(
    params.search?.trim() || params.kind || params.scope || params.active
  );

  const handleCreateSubmit = async (data: CreateDiscountInput | UpdateDiscountInput) => {
    await discountService.createDiscount(data as CreateDiscountInput);
    await refresh();
  };

  const handleEditSubmit = async (data: CreateDiscountInput | UpdateDiscountInput) => {
    if (!editingDiscount) return;
    await discountService.updateDiscount(editingDiscount.id, data as UpdateDiscountInput);
    await refresh();
  };

  const handleToggleActive = async (discount: DiscountRule) => {
    const actionWord = discount.active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionWord} the discount rule "${discount.name}"?`)) {
      return;
    }

    setIsTogglingId(discount.id);
    try {
      await discountService.toggleActive(discount.id, !discount.active);
      await refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to ${actionWord} discount rule.`);
    } finally {
      setIsTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Discounts & Promotion Rules"
        description="Manage promotional pricing, fixed and percentage discounts, product or subscription scopes, and threshold policies."
        actions={
          isAdmin ? (
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
              className="bg-[#5B4DDB] hover:bg-[#4a3dc4] text-white"
            >
              + Create Discount
            </Button>
          ) : undefined
        }
      />

      {/* Backend API Unavailable Notice */}
      {isEndpointUnavailable && (
        <div
          className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm"
          role="status"
          data-testid="discounts-unavailable-notice"
        >
          <div>
            <div className="font-semibold text-amber-900">Discounts API Service Pending (/api/discounts)</div>
            <div className="text-amber-700 text-xs mt-0.5">
              The backend discounts endpoint has not yet been mounted in FastAPI by Adithya. You can configure rules once the backend service is deployed.
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            className="text-amber-900 hover:bg-amber-100/80 border border-amber-300 w-fit shrink-0 text-xs"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Filters Toolbar */}
      <DiscountFilters
        params={params}
        onChange={setParams}
        disabled={loading && discounts.length === 0}
      />

      {/* Content Rendering */}
      {loading && discounts.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm">
          <LoadingSkeleton rows={5} />
        </div>
      ) : error && !isEndpointUnavailable ? (
        <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm">
          <ErrorState
            title="Failed to Load Discounts"
            message={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : discounts.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm">
          <EmptyState
            title={hasFilterActive ? 'No matching discounts found' : 'No discount rules configured'}
            description={
              hasFilterActive
                ? 'Try adjusting or clearing your search and filter criteria.'
                : isAdmin
                ? 'Create fixed or percentage promotion rules to incentivize subscriptions or bulk volume purchases.'
                : 'No discount rules have been configured by administrators yet.'
            }
            action={
              hasFilterActive ? (
                <Button variant="ghost" onClick={() => setParams({ page: 1 })}>
                  Clear Filters
                </Button>
              ) : isAdmin ? (
                <Button
                  variant="primary"
                  onClick={() => setIsCreating(true)}
                  className="bg-[#5B4DDB] hover:bg-[#4a3dc4] text-white"
                >
                  Create First Discount
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            Showing {discounts.length} {discounts.length === 1 ? 'rule' : 'rules'}
            {total > discounts.length ? ` of ${total} total` : ''}
          </div>
          <DiscountTable
            discounts={discounts}
            isAdmin={isAdmin}
            onEdit={(discount) => setEditingDiscount(discount)}
            onToggleActive={handleToggleActive}
            togglingId={isTogglingId}
          />
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <DiscountFormModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateSubmit}
        />
      )}

      {/* Edit Modal */}
      {editingDiscount && (
        <DiscountFormModal
          isOpen={Boolean(editingDiscount)}
          initialData={editingDiscount}
          onClose={() => setEditingDiscount(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}
