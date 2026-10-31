import type { Role } from '../auth/contract';
import type { InvoiceDetail } from './invoice-detail-api';

export type InvoiceReviewAction = 'confirm' | 'cancel';

// Architecture §7.2 names POST /api/invoices/{id}/confirm, /cancel and /send.
// No payload/result DTOs exist yet. Do not wire mutation requests from these paths.
export const invoiceMutationBlocker = 'Unavailable: the backend invoice action request and response contracts are not confirmed. No change can be submitted.';

/** These are conservative UI prerequisites, never server authorization. */
export function invoiceReviewBlocker(invoice: InvoiceDetail, role: Role | undefined, action: InvoiceReviewAction): string | null {
  if (role !== 'ADMIN' && role !== 'STAFF') return 'Only administrators and staff can manage invoices.';
  if (invoice.status === 'PAID') return 'Paid invoices cannot be confirmed or cancelled. An authorized reversal process is required for corrections.';
  if (invoice.status === 'CANCELLED') return 'This invoice is already cancelled.';
  if (action === 'confirm' && invoice.status !== 'DRAFT') return 'Only draft invoices can be confirmed.';
  if (invoice.paid_minor === undefined) return 'The recorded paid amount is unavailable. Refresh after the service supplies payment information.';
  if (invoice.paid_minor > 0 || invoice.payments?.some(payment => payment.amount_minor > 0)) return 'An invoice with recorded payments cannot be cancelled or confirmed again.';
  if (action === 'confirm' && (invoice.subtotal_minor === undefined || invoice.discount_minor === undefined || invoice.tax_minor === undefined || !invoice.lines?.length)) {
    return 'Confirmation requires the complete draft totals and itemized snapshots from the service.';
  }
  return null;
}

/** Compare server snapshots, without constructing prices or expected mutation fields. */
export function sameInvoiceSnapshot(before: InvoiceDetail, after: InvoiceDetail): boolean {
  return JSON.stringify(before) === JSON.stringify(after);
}
