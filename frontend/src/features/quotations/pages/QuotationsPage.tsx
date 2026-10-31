import React, { useState } from 'react';
import { PageHeader, Button, EmptyState } from '../../../components/ui';
import { useQuotations } from '../hooks/useQuotations';
import { quotationService } from '../services/quotationService';
import { QuotationFilters } from '../components/QuotationFilters';
import { QuotationTable } from '../components/QuotationTable';
import { CreateQuotationModal } from '../components/CreateQuotationModal';
import { QuotationDetailModal } from '../components/QuotationDetailModal';
import type { Quotation, CreateQuotationInput } from '../types';

export const QuotationsPage: React.FC = () => {
  const {
    quotations,
    loading,
    error,
    isEndpointUnavailable,
    params,
    updateFilters,
    refresh,
  } = useQuotations();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmingQuotation, setConfirmingQuotation] = useState<Quotation | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreateQuotation = async (input: CreateQuotationInput) => {
    setActionError(null);
    try {
      const created = await quotationService.createQuotation(input);
      setActionSuccess(`Quotation ${created.number || 'created'} successfully!`);
      refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Failed to create quotation.');
      }
      throw err;
    }
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDetailModalOpen(true);
  };

  const handleOpenConfirmDialog = (quotation: Quotation) => {
    setConfirmingQuotation(quotation);
  };

  const handleExecuteConfirm = async () => {
    if (!confirmingQuotation) return;
    setIsSubmittingConfirm(true);
    setActionError(null);
    try {
      const updated = await quotationService.confirmQuotation(confirmingQuotation.id);
      setActionSuccess(`Quotation ${confirmingQuotation.number} confirmed successfully! Linked subscription transitioned to CONFIRMED.`);
      setSelectedQuotation(updated);
      setConfirmingQuotation(null);
      refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Failed to confirm quotation.');
      }
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const hasFilters = Boolean(
    params.search ||
    params.status ||
    params.from_date ||
    params.to_date
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Quotations"
        description="Issue, customize, review and confirm commercial quotations linked to subscriptions."
        action={
          <Button
            type="button"
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
          >
            + Create Quotation
          </Button>
        }
      />

      {/* Backend 404 Notice Banner */}
      {isEndpointUnavailable && (
        <div
          role="alert"
          className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r text-amber-900 shadow-sm"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="text-sm font-semibold">Backend Endpoint Notice</h4>
              <p className="mt-1 text-xs text-amber-700">
                The `/api/quotations` backend endpoint is pending implementation or routing in FastAPI.
                The frontend UI, workflows, line item editors, and confirmation logic are fully ready and will connect automatically once the backend route is mounted.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={refresh}
              className="ml-4 text-xs"
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Action Notifications */}
      {actionSuccess && (
        <div
          role="status"
          className="p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg flex items-center justify-between"
        >
          <span>{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-green-600 hover:text-green-800 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg flex items-center justify-between"
        >
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-800 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter controls */}
      <QuotationFilters
        filters={params}
        onChange={updateFilters}
        onReset={() =>
          updateFilters({
            search: '',
            status: '',
            from_date: '',
            to_date: '',
          })
        }
      />

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading quotations...</p>
        </div>
      ) : error && !isEndpointUnavailable ? (
        <div className="p-8 text-center bg-white border border-gray-200 rounded-lg">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={refresh}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      ) : quotations.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No quotations match filters' : 'No quotations created yet'}
          description={
            hasFilters
              ? 'Try adjusting your search terms, status filters, or date range.'
              : 'Create a quotation for a customer to snapshot pricing, products, and subscription terms.'
          }
          action={
            hasFilters ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  updateFilters({
                    search: '',
                    status: '',
                    from_date: '',
                    to_date: '',
                  })
                }
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => setCreateModalOpen(true)}
              >
                Create Quotation
              </Button>
            )
          }
        />
      ) : (
        <QuotationTable
          quotations={quotations}
          onView={handleViewQuotation}
          onConfirm={handleOpenConfirmDialog}
        />
      )}

      {/* Guided Create Quotation Wizard Modal */}
      <CreateQuotationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateQuotation}
      />

      {/* Quotation Detail Modal */}
      <QuotationDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
        onConfirm={async (q) => {
          await quotationService.confirmQuotation(q.id);
          setActionSuccess(`Quotation ${q.number} confirmed successfully! Linked subscription transitioned to CONFIRMED.`);
          refresh();
        }}
      />

      {/* Quotation Confirmation Modal Dialog */}
      {confirmingQuotation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-quotation-title"
        >
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 p-6 space-y-4">
            <h3 id="confirm-quotation-title" className="text-base font-bold text-gray-900">
              Confirm Quotation
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to confirm quotation <span className="font-semibold text-gray-900">{confirmingQuotation.number}</span>?
            </p>
            <p className="text-xs text-gray-500 bg-amber-50 p-2.5 rounded border border-amber-200">
              Confirming this quotation will mark its status as <span className="font-semibold">ACCEPTED</span> and transition the linked subscription to <span className="font-semibold">CONFIRMED</span> status.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmingQuotation(null)}
                disabled={isSubmittingConfirm}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleExecuteConfirm}
                disabled={isSubmittingConfirm}
              >
                {isSubmittingConfirm ? 'Confirming...' : 'Yes, Confirm Quotation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
