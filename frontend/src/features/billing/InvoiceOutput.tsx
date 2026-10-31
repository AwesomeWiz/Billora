import { useEffect, useId, useRef, useState } from 'react';
import { Button, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { useAuth } from '../auth/AuthProvider';
import type { InvoiceDetail } from './invoice-detail-api';

export function InvoiceDelivery({ invoice }: { invoice: InvoiceDetail }) {
  const { state } = useAuth();
  const reasonId = useId();
  if (state.user?.role !== 'ADMIN' && state.user?.role !== 'STAFF') return null;
  return <section className="card invoice-delivery no-print" aria-label="Invoice delivery">
    <div className="invoice-output-heading"><h2>Invoice delivery</h2><StatusBadge status="DELIVERY_UNVERIFIED" label="Delivery not verified" tone="neutral" /></div>
    <p className="muted">No verified delivery result is available. Confirmation, queue acceptance, and printing do not prove that an email reached the customer.</p>
    {invoice.sent_at && <p className="invoice-send-timestamp">Send timestamp reported by the service: <time dateTime={invoice.sent_at}>{formatDate(invoice.sent_at, { hour: '2-digit', minute: '2-digit' })}</time> (IST). This does not establish delivery.</p>}
    <div className="invoice-output-action"><Button variant="secondary" disabled aria-describedby={reasonId}>Send invoice (unavailable)</Button>
      <p id={reasonId} className="field-hint">{invoice.status === 'DRAFT' ? 'A draft must be confirmed before sending. ' : invoice.status === 'CANCELLED' ? 'Sending a cancelled invoice is unavailable. ' : ''}The send request, delivery result, and duplicate-send contracts still require backend confirmation. No email has been requested by this screen.</p>
    </div>
  </section>;
}

export function InvoicePrint({ invoice }: { invoice: InvoiceDetail }) {
  const { state } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  const hintId = useId();
  useEffect(() => () => cleanup.current?.(), []);
  if (state.user?.role !== 'ADMIN' && state.user?.role !== 'STAFF') return null;

  function print() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(false);
    const finish = () => {
      cleanup.current?.(); cleanup.current = null;
      busy.current = false; setPending(false);
    };
    window.addEventListener('afterprint', finish);
    cleanup.current = () => window.removeEventListener('afterprint', finish);
    try { window.print(); }
    catch { finish(); setError(true); }
  }
  return <section className="invoice-print-controls no-print" aria-label="Invoice printing">
    <div><Button variant="secondary" loading={pending} onClick={print} aria-describedby={hintId}>Print invoice</Button>
      <p id={hintId} className="field-hint">{invoice.status === 'DRAFT' ? 'Draft copy. ' : invoice.status === 'CANCELLED' ? 'Cancelled copy. ' : ''}Opens the browser print dialog using the loaded invoice snapshot. Printing does not confirm, send, or record payment. Missing values remain marked unavailable.</p>
    </div>
    {error && <p role="alert">The print dialog could not open. You can try the browser’s Print command. No invoice change or delivery is assumed.</p>}
  </section>;
}
