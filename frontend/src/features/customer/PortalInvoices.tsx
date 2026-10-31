import { Link } from 'react-router-dom';
import { Button, EmptyState, PageHeader } from '../../components/ui';
import { PortalAvailability } from './PortalAvailability';

/** Do not mount the operational InvoiceDetailPage: it loads internal relations. */
export function PortalInvoices({ detail = false }: { detail?: boolean }) {
  return <>
    <PageHeader title={detail ? 'Your invoice' : 'My invoices'}
      description="Your invoice snapshots, due dates and recorded balances."
      action={detail ? <Link className="button button-secondary" to="/portal/invoices">Back to my invoices</Link> : undefined} />
    <PortalAvailability resource="invoices" />
    {detail && <>
      <section className="card account-card" aria-label="Invoice printing">
        <div className="card-header"><h2>Print your invoice</h2></div>
        <p id="portal-print-reason" className="account-note">Printing requires an authorized, immutable invoice snapshot. No snapshot has been loaded; current product prices will never be substituted for historical amounts.</p>
        <Button variant="secondary" disabled aria-describedby="portal-print-reason">Print invoice</Button>
      </section>
      <section className="card" aria-label="Your payment history">
        <EmptyState title="Payment history is not connected yet" description="Recorded payments require verified access to this invoice. No payment entries or settlement totals have been loaded." />
      </section>
    </>}
  </>;
}
