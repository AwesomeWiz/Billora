export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
const statuses: Record<string, [string, StatusTone]> = {
  DRAFT: ['Draft', 'neutral'], QUOTATION: ['Quotation', 'info'], CONFIRMED: ['Confirmed', 'info'],
  ACTIVE: ['Active', 'success'], PAUSED: ['Paused', 'warning'], CLOSED: ['Closed', 'neutral'],
  PAID: ['Paid', 'success'], CANCELLED: ['Cancelled', 'neutral'], OVERDUE: ['Overdue', 'danger'],
  PARTIALLY_PAID: ['Partially paid', 'warning'], PREVIEW_ONLY: ['Preview only', 'neutral'],
};

export function StatusBadge({ status, label, tone, domain }: {
  status: string; label?: string; tone?: StatusTone; domain?: 'subscription' | 'invoice';
}) {
  const [defaultLabel, defaultTone] = statuses[status] ?? [status, 'neutral'];
  const invoiceLabel = domain === 'invoice' && status === 'CONFIRMED' ? 'Awaiting payment' : defaultLabel;
  return <span className={`badge badge-${tone ?? defaultTone}`}><span className="badge-dot" aria-hidden="true" />{label ?? invoiceLabel}</span>;
}
