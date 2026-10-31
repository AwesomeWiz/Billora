import { StatusBadge } from '../../components/ui';
import type { InvoiceSummary } from './invoice-api';

export function InvoiceLifecycleBadge({ invoice }: { invoice: InvoiceSummary }) {
  return <StatusBadge status={invoice.status} domain="invoice" label={invoice.status === 'CONFIRMED' ? 'Confirmed' : undefined} />;
}

/** Presentation of server facts only; never use the device date to declare overdue. */
export function InvoicePaymentBadge({ invoice }: { invoice: InvoiceSummary }) {
  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') return <StatusBadge status="NOT_COLLECTIBLE" label="Not collectible" tone="neutral" />;
  if (invoice.status === 'PAID') return <StatusBadge status="PAID" />;
  if (invoice.payment_status) return <StatusBadge status={invoice.payment_status} label={invoice.payment_status === 'UNPAID' ? 'Unpaid' : undefined} tone={invoice.payment_status === 'UNPAID' ? 'warning' : undefined} />;
  if (invoice.paid_minor !== undefined && invoice.paid_minor > 0 && invoice.paid_minor < invoice.total_minor) return <StatusBadge status="PARTIALLY_PAID" />;
  if (invoice.paid_minor === invoice.total_minor || invoice.balance_minor === 0) return <StatusBadge status="AWAITING_SETTLEMENT" label="Awaiting settlement" tone="info" />;
  if (invoice.paid_minor === 0 || (invoice.balance_minor !== undefined && invoice.balance_minor > 0)) return <StatusBadge status="BALANCE_DUE" label="Balance due" tone="warning" />;
  return <span className="muted">Not provided</span>;
}
