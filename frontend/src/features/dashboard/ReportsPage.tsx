import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, ErrorState, Input, Money, PageHeader, StatusBadge } from '../../components/ui';
import { errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { InvoicePaymentBadge } from '../billing/InvoiceStatus';
import { Pagination, RecordsLoading, RecordTable } from '../customer/RecordViews';
import { useRecordResource } from '../customer/records';
import { FinancialSummary, ReportError } from './FinancialSummary';
import { overdueApi, overduePagination } from './overdue-api';

function OverdueReport({ page, pageSize, onPage, onSize }: { page: number; pageSize: number; onPage: (page: number) => void; onSize: (size: string) => void }) {
  const load = useCallback((signal: AbortSignal) => overdueApi.list(page, pageSize, signal), [page, pageSize]);
  const { resource, reload } = useRecordResource(`${page}:${pageSize}`, load);
  const data = resource.status === 'ready' ? resource.data : null;
  return <section className="card overdue-report" id="overdue-invoices" aria-label="Overdue invoice report">
    <div className="card-header"><div><h2>Overdue invoices</h2><p className="muted">Collectible invoices identified as overdue by the service. Amounts retain each invoice’s currency.</p></div>
      <Button variant="secondary" disabled={resource.status === 'loading'} onClick={reload}>Refresh overdue report</Button></div>
    {resource.status === 'loading' && <RecordsLoading label="Loading overdue invoices" />}
    {resource.status === 'error' && <ReportError error={resource.error} name="Overdue report" retry={reload} />}
    {data && (data.items.length ? <RecordTable caption="Overdue invoices" columns={['Invoice', 'Customer', 'Due date', 'Invoice total', 'Paid amount', 'Outstanding', 'Payment status']}>
      {data.items.map(invoice => <tr key={invoice.id}>
        <td><Link to={'/app/invoices/' + encodeURIComponent(invoice.id)}>{invoice.number}</Link><span className="record-subtext"><StatusBadge status="OVERDUE" /></span></td>
        <td><Link to={'/app/customers/' + encodeURIComponent(invoice.billing_account_id)}>{invoice.billing_account?.display_name ?? invoice.billing_account_id}</Link></td>
        <td className="finance-report-date"><time dateTime={invoice.due_on}>{formatDate(invoice.due_on)}</time></td>
        <td className="record-number"><Money amountMinor={invoice.total_minor} currency={invoice.currency} /></td>
        <td className="record-number">{invoice.paid_minor === undefined ? 'Not provided' : <Money amountMinor={invoice.paid_minor} currency={invoice.currency} />}</td>
        <td className="record-number"><Money amountMinor={invoice.balance_minor!} currency={invoice.currency} /></td>
        <td><InvoicePaymentBadge invoice={invoice} /></td>
      </tr>)}
    </RecordTable> : <EmptyState title="No overdue invoices in this response" description="The service returned an empty page. This does not replace or recalculate the separate summary metrics." />)}
    {data && <Pagination data={data} onPage={onPage} onSize={onSize} />}
    <p className="finance-table-note">Page totals and records come from the overdue endpoint. Summary figures are never summed from this table.</p>
  </section>;
}

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  let pagination: { page: number; pageSize: number };
  try { pagination = overduePagination(params); }
  catch (error) { return <><PageHeader title="Reports" description="Financial summary and overdue receivables." />
    <ErrorState title="Report filters unavailable" description={errorMessage(error)} /><Link className="button button-secondary" to="/app/reports">Reset report filters</Link></>; }
  function change(name: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); next.set(name, value); if (name !== 'page') next.delete('page'); return next; });
  }
  return <>
    <PageHeader title="Reports" description="Financial summary and overdue receivables. Every amount comes from the reporting service." />
    <section className="card finance-filter-controls" aria-label="Report date filters">
      <div className="finance-filter-fields"><Input label="From date" type="date" disabled hint="Date filtering unavailable" /><Input label="Through date" type="date" disabled hint="Date filtering unavailable" /></div>
      <p className="muted">Date-query fields and range semantics await service confirmation. The summary uses the service’s returned period; overdue pagination does not change the summary scope.</p>
    </section>
    <FinancialSummary />
    <OverdueReport page={pagination.page} pageSize={pagination.pageSize} onPage={page => change('page', String(page))} onSize={size => change('page_size', size)} />
  </>;
}
