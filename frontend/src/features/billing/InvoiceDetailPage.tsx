import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Brand } from '../../app/Brand';
import { EmptyState, Money, PageHeader } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { RecordError, RecordsLoading, RecordTable } from '../customer/RecordViews';
import { useRecordResource } from '../customer/records';
import { invoiceDetailApi, type InvoiceDetail } from './invoice-detail-api';
import { InvoiceLifecycleBadge, InvoicePaymentBadge } from './InvoiceStatus';
import { InvoiceActions } from './InvoiceActions';
import { InvoiceDelivery, InvoicePrint } from './InvoiceOutput';
import { InvoicePaymentHistory } from './InvoicePaymentHistory';
import { PaymentRecording } from './PaymentRecording';
import './billing.css';

function SnapshotMoney({ amount, currency }: { amount?: number; currency: string }) {
  return amount === undefined ? <span className="muted">Not provided</span> : <Money amountMinor={amount} currency={currency} />;
}

function InvoiceDocument({ invoice }: { invoice: InvoiceDetail }) {
  const account = invoice.billing_account;
  const subscriptions = [...new Set(invoice.lines?.flatMap(line => line.source_subscription_id ? [line.source_subscription_id] : []) ?? [])];
  return <article className="card invoice-document" aria-label={'Invoice ' + invoice.number}>
    <header className="invoice-document-header">
      <Brand to="/app/invoices" />
      <div><h2>Invoice</h2><p className="tabular-nums">{invoice.number}</p><span className="muted">{invoice.status === 'DRAFT' ? 'Draft calculation snapshot' : 'Invoice snapshot'}</span></div>
    </header>
    {invoice.status === 'DRAFT' && <p className="invoice-snapshot-note">This is a draft. Amounts may change before the invoice is confirmed.</p>}
    <div className="invoice-info-grid">
      <section aria-label="Customer billing details">
        <h2>Billed to</h2>
        <p className="invoice-customer-name">{account?.display_name ?? 'Billing name not provided'}</p>
        <p>{account?.billing_email ?? 'Billing email not provided'}</p>
        <p className="invoice-address">{account?.billing_address ?? 'Billing address not provided'}</p>
        <Link className="no-print" to={'/app/customers/' + encodeURIComponent(invoice.billing_account_id)}>View current account</Link>
        <p className="invoice-caption">Billing details above are shown only as supplied with this invoice.</p>
      </section>
      <dl className="invoice-metadata">
        <div><dt>Invoice number</dt><dd>{invoice.number}</dd></div>
        <div><dt>Invoice state</dt><dd><InvoiceLifecycleBadge invoice={invoice} /></dd></div>
        <div><dt>Issue date</dt><dd><time dateTime={invoice.issued_on}>{formatDate(invoice.issued_on)}</time></dd></div>
        <div><dt>Due date</dt><dd><time dateTime={invoice.due_on}>{formatDate(invoice.due_on)}</time></dd></div>
        <div><dt>Currency</dt><dd>{invoice.currency}</dd></div>
        <div><dt>Billing account</dt><dd>{invoice.billing_account_id}</dd></div>
      </dl>
    </div>
    <section className="invoice-reference-section" aria-label="Related subscriptions">
      <h2>Related subscriptions</h2>
      {subscriptions.length ? <ul>{subscriptions.map(id => <li key={id}><Link to={'/app/subscriptions/' + encodeURIComponent(id)}>{id}</Link></li>)}</ul>
        : <p className="muted">Subscription references were not supplied with this invoice.</p>}
    </section>
    <section className="invoice-lines" aria-label="Invoice line items">
      <div className="card-header"><div><h2>Invoice lines</h2><p className="muted">Prices, discounts, and taxes supplied in the invoice snapshot.</p></div></div>
      {invoice.lines === undefined ? <EmptyState title="Invoice lines unavailable" description="The invoice response did not include itemized snapshots. Current product prices are not substituted." />
        : invoice.lines.length === 0 ? <EmptyState title="No invoice lines returned" description="The service supplied an empty line list. The invoice totals below remain the server's recorded values." />
        : <RecordTable caption="Invoice line items" columns={['Item / variant', 'Quantity', 'Agreed unit price', 'Subtotal', 'Discount', 'Tax', 'Line total']}>
          {invoice.lines.map(line => <tr key={line.id}>
            <td>{line.description}<span className="record-subtext">{line.variant_description ?? (line.variant_id ? 'Variant: ' + line.variant_id : 'Variant not supplied')}</span></td>
            <td className="record-number">{line.quantity}</td><td className="record-number"><Money amountMinor={line.unit_price_minor} currency={invoice.currency} /></td>
            <td className="record-number"><SnapshotMoney amount={line.line_subtotal_minor} currency={invoice.currency} /></td>
            <td className="record-number"><SnapshotMoney amount={line.discount_minor} currency={invoice.currency} /></td>
            <td className="record-number"><SnapshotMoney amount={line.tax_minor} currency={invoice.currency} />{line.tax_bps !== undefined && <span className="record-subtext">{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(line.tax_bps / 100)}% snapshot rate</span>}</td>
            <td className="record-number"><SnapshotMoney amount={line.total_minor} currency={invoice.currency} /></td>
          </tr>)}
        </RecordTable>}
    </section>
    <div className="invoice-financial-grid">
      <section aria-label="Payment summary" className="invoice-settlement">
        <h2>Payment summary</h2><InvoicePaymentBadge invoice={invoice} />
        <dl className="invoice-totals">
          <div><dt>Amount paid</dt><dd><SnapshotMoney amount={invoice.paid_minor} currency={invoice.currency} /></dd></div>
          <div><dt>Outstanding balance</dt><dd><SnapshotMoney amount={invoice.balance_minor} currency={invoice.currency} /></dd></div>
        </dl>
        <p className="invoice-caption">{invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' ? 'This invoice is not collectible. Any supplied balance is shown as recorded.' : 'Only the service determines settlement and the remaining balance.'}</p>
      </section>
      <section aria-label="Financial breakdown">
        <h2>Financial breakdown</h2>
        <dl className="invoice-totals">
          <div><dt>Subtotal</dt><dd><SnapshotMoney amount={invoice.subtotal_minor} currency={invoice.currency} /></dd></div>
          <div><dt>Discounts deducted</dt><dd><SnapshotMoney amount={invoice.discount_minor} currency={invoice.currency} /></dd></div>
          <div><dt>Taxes</dt><dd><SnapshotMoney amount={invoice.tax_minor} currency={invoice.currency} /></dd></div>
          <div className="invoice-grand-total"><dt>Grand total</dt><dd><Money amountMinor={invoice.total_minor} currency={invoice.currency} /></dd></div>
        </dl>
      </section>
    </div>
    <section className="invoice-payments" aria-label="Recorded payments">
      <div className="card-header"><div><h2>Recorded payments</h2><p className="muted">Payment entries supplied with this invoice · timestamps in Asia/Kolkata (IST).</p></div></div>
      {invoice.payments === undefined ? <EmptyState title="Payment entries unavailable" description="The invoice response did not supply payment history. The recorded paid amount above is not inferred from an empty list." />
        : invoice.payments.length === 0 ? <EmptyState title="No payment entries returned" description="No payment entries were included in this response. Settlement still follows the invoice's server-provided status and balances." />
        : <RecordTable caption="Recorded invoice payments" columns={['Payment', 'Method', 'Payment date (IST)', 'Amount', 'Note']}>
          {invoice.payments.map(payment => <tr key={payment.id}><td>{payment.id}</td><td>{payment.method.replaceAll('_', ' ')}</td><td><time dateTime={payment.paid_at}>{formatDate(payment.paid_at, { hour: '2-digit', minute: '2-digit' })}</time></td>
            <td className="record-number"><Money amountMinor={payment.amount_minor} currency={invoice.currency} /></td><td>{payment.note ?? 'Not provided'}</td></tr>)}
        </RecordTable>}
    </section>
    <footer className="invoice-document-footer">Amounts are shown as recorded on the invoice. Unavailable values are not calculated from current catalog prices.</footer>
  </article>;
}

function InvoiceRecord({ id }: { id: string }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const load = useCallback((signal: AbortSignal) => invoiceDetailApi.detail(id, signal), [id]);
  const { resource, reload } = useRecordResource(id, load);
  const invoice = resource.status === 'ready' ? resource.data : null;
  function refreshPayments() { setHistoryOpen(true); reload(); }
  return <div className="invoice-detail-page">
    <PageHeader title={invoice?.number ?? 'Invoice details'} description="Invoice snapshots, recorded charges, and settlement information."
      breadcrumbs={[{ label: 'Invoices', href: '/app/invoices' }, { label: invoice?.number ?? 'Details' }]}
      action={invoice ? <InvoiceLifecycleBadge invoice={invoice} /> : undefined} />
    {resource.status === 'loading' && <RecordsLoading label="Loading invoice details" />}
    {resource.status === 'error' && <RecordError error={resource.error} retry={reload} />}
    {invoice && <><InvoiceActions invoice={invoice} onRefresh={reload} /><InvoiceDelivery invoice={invoice} /><InvoicePrint key={invoice.id} invoice={invoice} /><InvoiceDocument invoice={invoice} />
      <InvoicePaymentHistory invoice={invoice} expanded={historyOpen} onExpand={setHistoryOpen} onRefresh={refreshPayments} />
      <PaymentRecording invoice={invoice} onRefresh={refreshPayments} /></>}
  </div>;
}

export function InvoiceDetailPage() { const { id = '' } = useParams(); return <InvoiceRecord key={id} id={id} />; }
