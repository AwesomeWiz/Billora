import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Input, Money, PageHeader, Select, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { Pagination, RecordError, RecordsLoading, RecordTable, SearchRecords } from '../customer/RecordViews';
import { pageNumber, pageSize, useRecordResource } from '../customer/records';
import { subscriptionApi, subscriptionStatuses } from './api';

export function SubscriptionsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const customerId = params.get('customer_id') ?? '';
  const [customerDraft, setCustomerDraft] = useState(customerId);
  useEffect(() => setCustomerDraft(customerId), [customerId]);
  const query = new URLSearchParams({ page: String(pageNumber(params.get('page'))), page_size: String(pageSize(params.get('page_size'))), sort: 'created_at_desc' });
  if (search.trim()) query.set('search', search.trim());
  if (subscriptionStatuses.includes(status as typeof subscriptionStatuses[number])) query.set('status', status);
  if (customerId.trim()) query.set('customer_id', customerId.trim());
  const key = query.toString();
  const load = useCallback((signal: AbortSignal) => subscriptionApi.list(key, signal), [key]);
  const { resource, reload } = useRecordResource(key, load);
  function change(name: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(name, value); else next.delete(name); if (name !== 'page') next.delete('page'); return next; });
  }
  function searchRecords(value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [name, filter] of [['search', value], ['customer_id', customerDraft.trim()]]) {
        if (filter) next.set(name, filter); else next.delete(name);
      }
      next.delete('page');
      return next;
    });
  }
  const data = resource.status === 'ready' ? resource.data : null;
  return <>
    <PageHeader title="Subscriptions" description="Every agreement, its current status, and the next billing date." />
    <section className="card" aria-label="Subscription records">
      <SearchRecords search={search} label="Search subscriptions" onSearch={searchRecords}>
        <Select label="Subscription status" value={subscriptionStatuses.includes(status as typeof subscriptionStatuses[number]) ? status : ''} onChange={event => change('status', event.target.value)}>
          <option value="">All statuses</option>{subscriptionStatuses.map(value => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}
        </Select>
        <Input label="Customer account ID" value={customerDraft} maxLength={100} onChange={event => setCustomerDraft(event.target.value)} placeholder="Filter by account ID" />
      </SearchRecords>
      <p className="record-note">Amounts are server-provided recurring charges, not collected revenue. Account and plan IDs identify records when name projections are unavailable.</p>
      {(search || status || customerId) && <div className="record-padding"><Button variant="ghost" onClick={() => setParams({})}>Clear filters</Button></div>}
      {resource.status === 'loading' && <RecordsLoading label="Loading subscriptions" />}
      {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
      {data && (data.items.length ? <RecordTable caption="Subscriptions" columns={['Subscription', 'Customer', 'Plan', 'Status', 'Billing interval', 'Recurring amount', 'Next billing date']}>
        {data.items.map(item => <tr key={item.id}>
          <td><Link to={`/app/subscriptions/${encodeURIComponent(item.id)}`}>{item.number}</Link></td>
          <td><Link to={`/app/customers/${encodeURIComponent(item.account_id)}`}>{item.account_id}</Link></td><td>{item.plan_id}</td>
          <td><StatusBadge status={item.status} domain="subscription" /></td>
          <td>{item.billing_interval ? item.billing_interval.charAt(0) + item.billing_interval.slice(1).toLowerCase() : 'Not provided'}</td>
          <td className="record-number">{item.recurring_amount_minor === undefined ? 'Not provided' : <Money amountMinor={item.recurring_amount_minor} currency={item.currency} />}</td>
          <td>{item.next_billing_date ? formatDate(item.next_billing_date) : 'Not scheduled'}</td>
        </tr>)}
      </RecordTable> : <EmptyState title={search || status || customerId ? 'No subscriptions match these filters' : 'No subscriptions yet'} description={search || status || customerId ? 'Try another search, status, or customer account.' : 'Subscriptions will appear here after an agreement is created in the service.'} />)}
      {data && <Pagination data={data} onPage={value => change('page', String(value))} onSize={value => change('page_size', value)} />}
    </section>
  </>;
}
