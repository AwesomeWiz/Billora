import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, Input, Money, PageHeader, Select } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { Pagination, RecordError, RecordsLoading, RecordTable, SearchRecords } from '../customer/RecordViews';
import { useRecordResource } from '../customer/records';
import { invoiceApi, invoiceStatuses, type InvoiceStatus } from './invoice-api';
import { InvoiceLifecycleBadge, InvoicePaymentBadge } from './InvoiceStatus';
import './billing.css';

export function InvoiceListPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const status = params.get('status') ?? '';
  const due = params.get('due_on') ?? '';
  const [dueDraft, setDueDraft] = useState(due);
  useEffect(() => setDueDraft(due), [due]);
  const key = params.toString();
  const load = useCallback((signal: AbortSignal) => invoiceApi.list(key, signal), [key]);
  const { resource, reload } = useRecordResource(key, load);
  function change(name: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(name, value); else next.delete(name); if (name !== 'page') next.delete('page'); return next; });
  }
  function searchRecords(value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [name, filter] of [['search', value], ['due_on', dueDraft]]) { if (filter) next.set(name, filter); else next.delete(name); }
      next.delete('page'); return next;
    });
  }
  const data = resource.status === 'ready' ? resource.data : null;
  return <>
    <PageHeader title="Invoices" description="Issued amounts, recorded payments, and the balance on each invoice." />
    <section className="card invoice-list" aria-label="Invoice records">
      <SearchRecords label="Search invoices" search={search} onSearch={searchRecords}>
        <Select label="Invoice status" value={invoiceStatuses.includes(status as InvoiceStatus) ? status : ''} onChange={event => change('status', event.target.value)}>
          <option value="">All statuses</option>{invoiceStatuses.map(value => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}
        </Select>
        <Input label="Due on" type="date" value={dueDraft} onChange={event => setDueDraft(event.target.value)} hint="Exact due date · apply with Search" />
      </SearchRecords>
      <div className="invoice-list-note"><p>Amounts and balances come from invoice records. An unavailable balance is never treated as zero.</p>
        {(search || status || due) && <Button variant="ghost" onClick={() => { setDueDraft(''); setParams({}); }}>Clear filters</Button>}
      </div>
      {resource.status === 'loading' && <RecordsLoading label="Loading invoices" />}
      {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
      {data && (data.items.length ? <RecordTable caption="Invoices" columns={['Invoice', 'Customer', 'Issued', 'Due', 'Total', 'Paid', 'Outstanding', 'Invoice status', 'Payment status']}>
        {data.items.map(invoice => <tr key={invoice.id}>
          <td><Link to={`/app/invoices/${encodeURIComponent(invoice.id)}`}>{invoice.number}</Link></td>
          <td><Link to={`/app/customers/${encodeURIComponent(invoice.billing_account_id)}`}>{invoice.billing_account?.display_name ?? invoice.billing_account_id}</Link></td>
          <td className="invoice-date">{formatDate(invoice.issued_on)}</td><td className="invoice-date">{formatDate(invoice.due_on)}</td>
          <td className="record-number"><Money amountMinor={invoice.total_minor} currency={invoice.currency} /></td>
          <td className="record-number">{invoice.paid_minor === undefined ? 'Not provided' : <Money amountMinor={invoice.paid_minor} currency={invoice.currency} />}</td>
          <td className="record-number">{invoice.balance_minor === undefined ? 'Not provided' : <Money amountMinor={invoice.balance_minor} currency={invoice.currency} />}
            {(invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') && <span className="record-subtext">Not collectible</span>}</td>
          <td><InvoiceLifecycleBadge invoice={invoice} /></td><td><InvoicePaymentBadge invoice={invoice} /></td>
        </tr>)}
      </RecordTable> : <EmptyState title={search || status || due ? 'No invoices match these filters' : 'No invoices yet'}
        description={search || status || due ? 'Try another search, invoice status, or due date.' : 'Invoices will appear here when the billing service creates them.'} />)}
      {data && <Pagination data={data} onPage={value => change('page', String(value))} onSize={value => change('page_size', value)} />}
    </section>
  </>;
}
