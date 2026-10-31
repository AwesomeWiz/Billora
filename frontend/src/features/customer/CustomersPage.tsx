import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, PageHeader, Select } from '../../components/ui';
import { customerApi } from './api';
import { Pagination, RecordError, RecordsLoading, RecordTable, SearchRecords } from './RecordViews';
import { pageNumber, pageSize, useRecordResource } from './records';

export function CustomersPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const selectedCurrency = params.get('currency') ?? '';
  const query = new URLSearchParams({ page: String(pageNumber(params.get('page'))), page_size: String(pageSize(params.get('page_size'))), sort: 'created_at_desc' });
  if (search.trim()) query.set('search', search.trim());
  const key = query.toString();
  const load = useCallback((signal: AbortSignal) => customerApi.list(key, signal), [key]);
  const { resource, reload } = useRecordResource(key, load);
  function change(name: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(name, value); else next.delete(name); if (name !== 'page' && name !== 'currency') next.delete('page'); return next; });
  }
  const data = resource.status === 'ready' ? resource.data : null;
  const currencies = Array.from(new Set(['INR', ...(selectedCurrency ? [selectedCurrency] : []), ...(data?.items.map(item => item.currency) ?? [])]));
  const visible = data?.items.filter(item => !selectedCurrency || item.currency === selectedCurrency) ?? [];
  return <>
    <PageHeader title="Customers" description="Customer accounts and the agreements behind each billing relationship." />
    <section className="card" aria-label="Customer records">
      <SearchRecords search={search} label="Search customers" onSearch={value => change('search', value)}>
        <Select label="Billing currency (this page)" value={selectedCurrency} onChange={event => change('currency', event.target.value)}><option value="">All currencies</option>{currencies.map(value => <option key={value} value={value}>{value}</option>)}</Select>
      </SearchRecords>
      <p className="record-note">Search runs on the server. Currency filtering applies to the current page only.</p>
      {resource.status === 'loading' && <RecordsLoading label="Loading customers" />}
      {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
      {data && (visible.length ? <RecordTable caption="Customers" columns={['Customer', 'Billing email', 'Currency', 'Account']}>
        {visible.map(account => <tr key={account.id}><td><Link to={`/app/customers/${encodeURIComponent(account.id)}`}>{account.display_name}</Link></td><td>{account.billing_email}</td><td>{account.currency}</td><td><span className="record-subtext">{account.id}</span></td></tr>)}
      </RecordTable> : <EmptyState title={search || selectedCurrency ? 'No customers match these filters' : 'No customers yet'} description={selectedCurrency ? 'Try another currency on this page, or go to the next page.' : search ? 'Try a different customer name or billing email.' : 'Customer accounts will appear here when they are created in the service.'}
        action={search || selectedCurrency ? <Button variant="secondary" onClick={() => setParams({})}>Clear filters</Button> : undefined} />)}
      {data && <Pagination data={data} onPage={value => change('page', String(value))} onSize={value => change('page_size', value)} />}
    </section>
  </>;
}
