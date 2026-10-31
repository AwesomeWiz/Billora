import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState, Money, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { customerApi } from '../customer/api';
import { RecordError, RecordsLoading, RecordTable, UnavailableSection } from '../customer/RecordViews';
import { invalidRecord, useRecordResource } from '../customer/records';
import { subscriptionDetailApi, type SubscriptionDetail } from './detail-api';

function CustomerRelationship({ accountId }: { accountId: string }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const account = await customerApi.detail(accountId, signal);
    return account.id === accountId ? account : invalidRecord();
  }, [accountId]);
  const { resource, reload } = useRecordResource(accountId, load);
  return <section className="card"><div className="card-header"><h2>Customer</h2><Link to={`/app/customers/${encodeURIComponent(accountId)}`}>View billing account</Link></div>
    {resource.status === 'loading' && <RecordsLoading label="Loading subscription customer" />}
    {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
    {resource.status === 'ready' && <dl className="record-summary"><div><dt>Customer name</dt><dd>{resource.data.display_name}</dd></div><div><dt>Billing email</dt><dd>{resource.data.billing_email}</dd></div></dl>}
  </section>;
}

function PlanRelationship({ subscription }: { subscription: SubscriptionDetail }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const plan = await subscriptionDetailApi.plan(subscription.plan_id, signal);
    return plan.id === subscription.plan_id ? plan : invalidRecord();
  }, [subscription.plan_id]);
  const { resource, reload } = useRecordResource(subscription.plan_id, load);
  return <section className="card"><div className="card-header"><h2>Plan and policies</h2><span className="subtle-label">{subscription.plan_id}</span></div>
    {resource.status === 'loading' && <RecordsLoading label="Loading subscription plan" />}
    {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
    {resource.status === 'ready' && <dl className="record-summary"><div><dt>Plan name</dt><dd>{resource.data.name}</dd></div><div><dt>Billing interval</dt><dd>{resource.data.billing_interval.charAt(0) + resource.data.billing_interval.slice(1).toLowerCase()}</dd></div>
      <div><dt>Pause policy</dt><dd>{resource.data.can_pause === undefined ? 'Not provided' : resource.data.can_pause ? 'Permitted by plan' : 'Not permitted'}</dd></div><div><dt>Renewal policy</dt><dd>{resource.data.can_renew === undefined ? 'Not provided' : resource.data.can_renew ? 'Permitted by plan' : 'Not permitted'}</dd></div>
    </dl>}
    <p className="record-note">Lifecycle controls require a verified plan policy and a supported transition contract.</p>
  </section>;
}

function SubscriptionRecord({ id }: { id: string }) {
  const load = useCallback(async (signal: AbortSignal) => {
    const subscription = await subscriptionDetailApi.detail(id, signal);
    return subscription.id === id ? subscription : invalidRecord();
  }, [id]);
  const { resource, reload } = useRecordResource(id, load);
  const subscription = resource.status === 'ready' ? resource.data : null;
  return <>
    <PageHeader title={subscription?.number ?? 'Subscription details'} description="Agreed charges, billing dates, and subscription policy."
      breadcrumbs={[{ label: 'Subscriptions', href: '/app/subscriptions' }, { label: subscription?.number ?? 'Details' }]}
      action={subscription ? <StatusBadge status={subscription.status} domain="subscription" /> : undefined} />
    {resource.status === 'loading' && <RecordsLoading label="Loading subscription details" />}
    {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
    {subscription && <div className="record-sections">
      <section className="card"><div className="card-header"><h2>Agreement and billing schedule</h2><span className="subtle-label">{subscription.currency}</span></div>
        <dl className="record-summary"><div><dt>Start date</dt><dd>{subscription.start_date ? formatDate(subscription.start_date) : 'Not provided'}</dd></div><div><dt>Expiry date</dt><dd>{subscription.expiry_date ? formatDate(subscription.expiry_date) : 'No expiry provided'}</dd></div>
          <div><dt>Next billing date</dt><dd>{subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'Not scheduled'}</dd></div><div><dt>Payment terms</dt><dd>{subscription.payment_term_days === undefined ? 'Not provided' : subscription.payment_term_days === 0 ? 'Due on issue' : `${subscription.payment_term_days} days from issue`}</dd></div>
          <div><dt>Recurring amount</dt><dd>{subscription.recurring_amount_minor === undefined ? 'Not provided by the service' : <Money amountMinor={subscription.recurring_amount_minor} currency={subscription.currency} />}</dd></div><div><dt>Subscription ID</dt><dd>{subscription.id}</dd></div>
        </dl>
      </section>
      <CustomerRelationship accountId={subscription.account_id} />
      <PlanRelationship subscription={subscription} />
      <section className="card"><div className="card-header"><div><h2>Agreed product lines</h2><p className="muted">Contract unit prices, without recalculating invoice totals.</p></div></div>
        {subscription.lines === undefined ? <EmptyState title="Product lines unavailable" description="The detail API has not supplied agreed line items. Current catalog prices are not substituted." />
          : subscription.lines.length === 0 ? <EmptyState title="No product lines" description="The service returned no product lines for this agreement. Any separate plan fee is determined by the server." />
          : <RecordTable caption="Agreed product lines" columns={['Product / description', 'Variant', 'Quantity', 'Agreed unit price', 'Billable']}>
            {subscription.lines.map(line => <tr key={line.id}><td>{line.description}<span className="record-subtext">{line.product_id}</span></td><td>{line.variant_id ?? 'No variant provided'}</td><td className="record-number">{line.quantity}</td><td className="record-number"><Money amountMinor={line.unit_price_minor} currency={subscription.currency} /></td><td>{line.billable === undefined ? 'Not provided' : line.billable ? 'Yes' : 'No'}</td></tr>)}
          </RecordTable>}
      </section>
      <UnavailableSection title="Related invoices" description="Subscription-to-invoice relationships have not been published in the API contract. No invoice links or totals are inferred." />
      <UnavailableSection title="Lifecycle history" description="The subscription API does not yet provide a lifecycle history contract. No historical events are fabricated." />
    </div>}
  </>;
}

export function SubscriptionDetailPage() { const { id = '' } = useParams(); return <SubscriptionRecord key={id} id={id} />; }
