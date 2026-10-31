import React, { useState } from 'react';
import { Button, StatusBadge } from '../../../components/ui';
import type { StatusTone } from '../../../components/ui/StatusBadge';
import { paiseToRupees } from '../types';
import type { Quotation, QuotationStatus } from '../types';

interface QuotationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onConfirm?: (quotation: Quotation) => Promise<void>;
  loading?: boolean;
}

function getStatusTone(status: QuotationStatus): StatusTone {
  switch (status) {
    case 'ISSUED':
      return 'info';
    case 'ACCEPTED':
      return 'success';
    case 'EXPIRED':
      return 'warning';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onConfirm,
  loading = false,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !quotation) return null;

  const canConfirm = quotation.status === 'ISSUED' && Boolean(onConfirm);

  const handleConfirmAction = async () => {
    if (!onConfirm) return;
    setConfirming(true);
    setActionError(null);
    try {
      await onConfirm(quotation);
      setConfirmDialogOpen(false);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Failed to confirm quotation.');
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quotation-detail-title"
      >
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden my-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 id="quotation-detail-title" className="text-lg font-bold text-gray-900">
              Quotation: {quotation.number}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-lg leading-none"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                {actionError}
              </div>
            )}

            {/* Quotation Header Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Customer</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {quotation.customer_name || 'Customer Account'}
                </p>
                {quotation.customer_email && (
                  <p className="text-xs text-gray-600">{quotation.customer_email}</p>
                )}
                <p className="text-xs font-mono text-gray-400 mt-0.5">{quotation.account_id}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase">Status & Validity</span>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge
                    status={quotation.status}
                    tone={getStatusTone(quotation.status)}
                    label={quotation.status}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Issued: <span className="font-medium text-gray-800">{quotation.issued_on}</span> | Valid until:{' '}
                  <span className="font-medium text-gray-800">{quotation.valid_until}</span>
                </p>
              </div>

              {/* Linked Subscription */}
              <div className="md:col-span-2 pt-2 border-t border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase">Linked Subscription</span>
                <div className="mt-1 flex items-center justify-between text-sm bg-white p-2.5 rounded border border-gray-200">
                  <div>
                    <span className="text-gray-600">ID: </span>
                    <span className="font-mono font-medium text-gray-900">{quotation.subscription_id}</span>
                  </div>
                  {quotation.subscription && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Lifecycle State:</span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {quotation.subscription.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quotation Line Items */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Quotation Line Items</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-500 text-left">
                    <tr>
                      <th className="py-2.5 px-3">Product / Variant</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {quotation.lines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500 text-xs">
                          No product lines included in this quotation.
                        </td>
                      </tr>
                    ) : (
                      quotation.lines.map((line, idx) => {
                        const lineTotal =
                          line.subtotal_minor ?? line.quantity * line.unit_price_minor;
                        return (
                          <tr key={line.id || idx}>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-gray-900">
                                {line.product_name || `Product (${line.source_product_id.slice(0, 8)}...)`}
                              </div>
                              {line.variant_name && (
                                <div className="text-xs text-gray-500">
                                  Variant: {line.variant_name}
                                </div>
                              )}
                              {line.description && (
                                <div className="text-xs text-gray-400 mt-0.5">{line.description}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium text-gray-700">
                              {line.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right text-gray-700 font-mono">
                              {paiseToRupees(line.unit_price_minor, true)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-gray-900 font-mono">
                              {paiseToRupees(lineTotal, true)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Authoritative Financial Totals (from backend) */}
            <div className="flex flex-col items-end gap-1.5 p-4 bg-gray-50 rounded-lg border border-gray-100 text-sm">
              <div className="w-64 flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">
                  {quotation.subtotal_minor !== undefined && quotation.subtotal_minor !== null
                    ? paiseToRupees(quotation.subtotal_minor, true)
                    : '—'}
                </span>
              </div>
              {quotation.tax_minor !== undefined && quotation.tax_minor !== null && (
                <div className="w-64 flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span className="font-mono">{paiseToRupees(quotation.tax_minor, true)}</span>
                </div>
              )}
              <div className="w-64 flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span className="font-mono text-base text-indigo-700">
                  {quotation.total_minor !== undefined && quotation.total_minor !== null
                    ? paiseToRupees(quotation.total_minor, true)
                    : quotation.subtotal_minor !== undefined && quotation.subtotal_minor !== null
                    ? paiseToRupees(quotation.subtotal_minor, true)
                    : '—'}
                </span>
              </div>
            </div>

            {quotation.terms && (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase">Terms & Notes</span>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{quotation.terms}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading || confirming}>
              Close
            </Button>
            {canConfirm && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setConfirmDialogOpen(true)}
                disabled={loading || confirming}
              >
                Confirm Quotation
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
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
              Are you sure you want to confirm quotation <span className="font-semibold text-gray-900">{quotation.number}</span>?
            </p>
            <p className="text-xs text-gray-500 bg-amber-50 p-2.5 rounded border border-amber-200">
              Confirming this quotation will mark its status as <span className="font-semibold">ACCEPTED</span> and transition the linked subscription to <span className="font-semibold">CONFIRMED</span> status.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmDialogOpen(false)}
                disabled={confirming}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmAction}
                disabled={confirming}
              >
                {confirming ? 'Confirming...' : 'Yes, Confirm Quotation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
