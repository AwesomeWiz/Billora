import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui';
import { customerApi } from './api';
import { RecordError, RecordsLoading, UnavailableSection } from './RecordViews';
import { useRecordResource } from './records';

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const load = useCallback((signal: AbortSignal) => customerApi.detail(id, signal), [id]);
  const { resource, reload } = useRecordResource(id, load);
  const customer = resource.status === 'ready' ? resource.data : null;
  return <>
    <PageHeader title={customer?.display_name ?? 'Customer details'} description="Billing identity and connected records."
      breadcrumbs={[{ label: 'Customers', href: '/app/customers' }, { label: customer?.display_name ?? 'Details' }]} />
    {resource.status === 'loading' && <RecordsLoading label="Loading customer details" />}
    {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
    {customer && <div className="record-sections">
      <section className="card"><div className="card-header"><h2>Billing account</h2><span className="subtle-label">{customer.currency}</span></div>
        <dl className="record-summary"><div><dt>Customer name</dt><dd>{customer.display_name}</dd></div><div><dt>Billing email</dt><dd>{customer.billing_email}</dd></div><div><dt>Billing address</dt><dd>{customer.billing_address ?? 'Not provided'}</dd></div><div><dt>Account ID</dt><dd>{customer.id}</dd></div></dl>
      </section>
      <section className="card"><div className="card-header"><div><h2>Subscriptions</h2><p className="muted">Explore the agreements linked to this account.</p></div><Link className="button button-secondary" to={`/app/subscriptions?customer_id=${encodeURIComponent(customer.id)}`}>View subscriptions</Link></div>
        <p className="record-padding muted">The subscriptions view uses a server-side customer filter. No account totals are calculated locally.</p>
      </section>
      <UnavailableSection title="Invoices" description="Invoice relationships and the billing detail route have not been integrated yet. No invoice records are loaded here." />
    </div>}
  </>;
}
