import { useCallback, useId, useState } from 'react';
import { Button, EmptyState, ErrorState, Money } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { Pagination, RecordsLoading, RecordTable } from '../customer/RecordViews';
import { useRecordResource } from '../customer/records';
import type { InvoiceDetail } from './invoice-detail-api';
import { paymentHistoryApi } from './payments-api';

function HistoryRecords({ invoice }: { invoice: InvoiceDetail }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const load = useCallback((signal: AbortSignal) => paymentHistoryApi.list(invoice.id, page, pageSize, signal), [invoice.id, page, pageSize]);
  const { resource, reload } = useRecordResource(`${invoice.id}:${page}:${pageSize}`, load);
  const data = resource.status === 'ready' ? resource.data : null;
  const error = resource.status === 'error' ? resource.error : null;
  const status = error instanceof ApiError ? error.status : 0;
  return <>
    {resource.status === 'loading' && <RecordsLoading label="Loading invoice payment history" />}
    {resource.status === 'error' && <ErrorState
      title={status === 403 ? 'Payment history access denied' : status === 404 ? 'Payment history unavailable' : status === 409 ? 'Payment history changed' : 'Unable to load payment history'}
      description={status === 404 ? 'The invoice payment-history endpoint or record is unavailable. No empty history or successful payment is assumed.'
        : status === 409 ? 'The service reported a conflict. Refresh the invoice and history before reconciliation.' : errorMessage(error)}
      permission={status === 403} onRetry={status === 403 ? undefined : reload} />}
    {data && (data.items.length === 0
      ? <EmptyState title="No payment entries in this response" description="The service returned no entries on this page. Invoice balances remain the service’s recorded values; they are not recalculated from history." />
      : <RecordTable caption="Invoice payment history" columns={['Payment', 'Amount', 'Method', 'Payment date (IST)', 'Reference', 'Notes']}>
        {data.items.map(payment => <tr key={payment.id}>
          <td>{payment.id}</td><td className="record-number"><Money amountMinor={payment.amount_minor} currency={invoice.currency} /></td>
          <td>{payment.method.replaceAll('_', ' ')}</td><td><time dateTime={payment.paid_at}>{formatDate(payment.paid_at, { hour: '2-digit', minute: '2-digit' })}</time></td>
          <td>{payment.external_ref ?? 'Not provided'}</td><td>{payment.note ?? 'Not provided'}</td>
        </tr>)}
      </RecordTable>)}
    {data && <Pagination data={data} onPage={setPage} onSize={value => { setPage(1); setPageSize(Number(value)); }} />}
  </>;
}

export function InvoicePaymentHistory({ invoice, expanded, onExpand, onRefresh }: {
  invoice: InvoiceDetail; expanded: boolean; onExpand: (value: boolean) => void; onRefresh: () => void;
}) {
  const { state } = useAuth();
  const contentId = useId();
  if (state.user?.role !== 'ADMIN' && state.user?.role !== 'STAFF') return null;
  return <section className="card invoice-payment-history no-print" aria-label="Payment history">
    <div className="card-header"><div><h2>Payment history</h2><p className="muted">Live entries for {invoice.number}. The invoice snapshot above remains separate from this paginated history.</p></div>
      <div className="record-inline"><Button variant="secondary" aria-controls={contentId} aria-expanded={expanded} onClick={() => onExpand(!expanded)}>{expanded ? 'Hide payment history' : 'View payment history'}</Button>
        {expanded && <Button variant="secondary" onClick={onRefresh}>Refresh invoice and history</Button>}</div>
    </div>
    <div id={contentId}>{expanded && <HistoryRecords key={invoice.id} invoice={invoice} />}</div>
  </section>;
}
