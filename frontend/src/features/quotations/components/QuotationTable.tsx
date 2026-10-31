import React from 'react';
import { StatusBadge, Button } from '../../../components/ui';
import type { StatusTone } from '../../../components/ui/StatusBadge';
import { paiseToRupees } from '../types';
import type { Quotation, QuotationStatus } from '../types';

interface QuotationTableProps {
  quotations: Quotation[];
  onView: (quotation: Quotation) => void;
  onConfirm?: (quotation: Quotation) => void;
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

export const QuotationTable: React.FC<QuotationTableProps> = ({
  quotations,
  onView,
  onConfirm,
}) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm text-gray-900 border-collapse">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200">
          <tr>
            <th scope="col" className="py-3 px-4">Quotation #</th>
            <th scope="col" className="py-3 px-4">Customer</th>
            <th scope="col" className="py-3 px-4">Issued On</th>
            <th scope="col" className="py-3 px-4">Valid Until</th>
            <th scope="col" className="py-3 px-4">Status</th>
            <th scope="col" className="py-3 px-4 text-right">Total</th>
            <th scope="col" className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {quotations.map((quote) => {
            const isExpired = quote.status === 'EXPIRED';
            const canConfirm = quote.status === 'ISSUED' && onConfirm;

            return (
              <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-medium text-indigo-600">
                  <button
                    type="button"
                    onClick={() => onView(quote)}
                    className="hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded text-left font-medium text-indigo-600"
                  >
                    {quote.number}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">
                    {quote.customer_name || 'Customer Account'}
                  </div>
                  {quote.customer_email && (
                    <div className="text-xs text-gray-500">{quote.customer_email}</div>
                  )}
                  <div className="text-xs text-gray-400 font-mono">{quote.account_id}</div>
                </td>
                <td className="py-3 px-4 text-gray-600">{quote.issued_on}</td>
                <td className="py-3 px-4 text-gray-600">
                  <span className={isExpired ? 'text-amber-600 font-medium' : ''}>
                    {quote.valid_until}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge
                    status={quote.status}
                    tone={getStatusTone(quote.status)}
                    label={quote.status}
                  />
                  {quote.subscription && (
                    <div className="mt-1 text-xs text-gray-500">
                      Sub: <span className="font-mono">{quote.subscription.status}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {quote.total_minor !== undefined && quote.total_minor !== null
                    ? paiseToRupees(quote.total_minor, true)
                    : quote.subtotal_minor !== undefined && quote.subtotal_minor !== null
                    ? paiseToRupees(quote.subtotal_minor, true)
                    : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onView(quote)}
                    >
                      View
                    </Button>
                    {canConfirm && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onConfirm(quote)}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
