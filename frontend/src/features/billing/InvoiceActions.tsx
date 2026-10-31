import { useEffect, useId, useRef, useState } from 'react';
import { Button, Money } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { invoiceDetailApi, type InvoiceDetail } from './invoice-detail-api';
import { invoiceMutationBlocker, invoiceReviewBlocker, sameInvoiceSnapshot, type InvoiceReviewAction } from './invoice-actions';

type Review = { status: 'loading' } | { status: 'ready' | 'changed'; invoice: InvoiceDetail } | { status: 'error'; error: unknown };

export function InvoiceActions({ invoice, onRefresh }: { invoice: InvoiceDetail; onRefresh: () => void }) {
  const { state } = useAuth();
  const role = state.user?.role;
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const selectedRef = useRef<InvoiceReviewAction | null>(null);
  const [selected, setSelected] = useState<InvoiceReviewAction | null>(null);
  const [review, setReview] = useState<Review>({ status: 'loading' });
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  useEffect(() => () => controller.current?.abort(), []);
  if (role !== 'ADMIN' && role !== 'STAFF') return null;

  function dismiss() {
    controller.current?.abort(); selectedRef.current = null; setSelected(null);
  }
  function refresh() { dismiss(); onRefresh(); }
  async function loadReview(action: InvoiceReviewAction) {
    if (controller.current && !controller.current.signal.aborted && selectedRef.current) return;
    if (invoiceReviewBlocker(invoice, role, action)) return;
    const request = new AbortController();
    controller.current = request; selectedRef.current = action;
    setSelected(action); setReview({ status: 'loading' });
    try {
      const latest = await invoiceDetailApi.detail(invoice.id, request.signal);
      if (!request.signal.aborted) setReview({ status: sameInvoiceSnapshot(invoice, latest) ? 'ready' : 'changed', invoice: latest });
    } catch (error) {
      if (!request.signal.aborted) setReview({ status: 'error', error });
    }
  }
  function retry() {
    if (!selected) return;
    controller.current?.abort(); selectedRef.current = null;
    void loadReview(selected);
  }
  const reviewedInvoice = review.status === 'ready' || review.status === 'changed' ? review.invoice : null;
  const conflict = review.status === 'changed' || (review.status === 'error' && review.error instanceof ApiError && review.error.status === 409);
  const forbidden = review.status === 'error' && review.error instanceof ApiError && review.error.status === 403;

  return <section className="card invoice-actions no-print" aria-label="Invoice actions">
    <h2>Invoice actions</h2>
    <p className="muted">Review the current invoice before a financial change. Submission is unavailable until backend integration is confirmed.</p>
    <div className="invoice-action-options">
      {(['confirm', 'cancel'] as const).map(action => {
        const blocker = invoiceReviewBlocker(invoice, role, action);
        return <div key={action}>
          <Button variant="secondary" disabled={!!blocker || !!selected} aria-describedby={descriptionId + action}
            onClick={() => void loadReview(action)}>Review {action === 'confirm' ? 'confirmation' : 'cancellation'}</Button>
          <p id={descriptionId + action} className="field-hint">{blocker ?? (action === 'confirm'
            ? 'Review draft amounts. Confirmation must finalize discounts and validate the expected revision and total on the server.'
            : 'Only unpaid draft or confirmed invoices may be cancelled. Processed billing cycles must remain recorded.')}</p>
        </div>;
      })}
    </div>
    <p className="invoice-contract-note">{invoiceMutationBlocker}</p>
    <dialog ref={dialog} className="record-dialog invoice-review-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); dismiss(); }}>
      {selected && <>
        <h2 id={titleId}>{selected === 'confirm' ? 'Confirm' : 'Cancel'} {invoice.number}?</h2>
        <p id={descriptionId} className="muted">{selected === 'confirm'
          ? 'Confirmation freezes invoice amounts and consumes applicable discount usage. Changed draft totals require a new review.'
          : 'Cancellation makes this invoice noncollectible. It does not delete payments, erase processed billing cycles, or automatically reissue the invoice.'}</p>
        {review.status === 'loading' && <p role="status">Checking the current invoice with the service…</p>}
        {review.status === 'error' && <div className="notice notice-error" role="alert">{errorMessage(review.error)} No invoice change has been submitted.</div>}
        {reviewedInvoice && <dl className="invoice-review-totals">
          <div><dt>Server invoice state</dt><dd>{reviewedInvoice.status}</dd></div>
          <div><dt>Recorded total</dt><dd><Money amountMinor={reviewedInvoice.total_minor} currency={reviewedInvoice.currency} /></dd></div>
          <div><dt>Recorded paid amount</dt><dd>{reviewedInvoice.paid_minor === undefined ? 'Not provided' : <Money amountMinor={reviewedInvoice.paid_minor} currency={reviewedInvoice.currency} />}</dd></div>
        </dl>}
        {conflict && <p className="notice notice-warning" role="alert">The invoice changed or the service reported a conflict. Refresh the invoice and review it again. No completion is assumed.</p>}
        {reviewedInvoice && invoiceReviewBlocker(reviewedInvoice, role, selected) && <p role="alert">{invoiceReviewBlocker(reviewedInvoice, role, selected)}</p>}
        <p className="invoice-contract-note">{invoiceMutationBlocker}</p>
        <div className="record-inline">
          <Button variant="secondary" autoFocus onClick={dismiss}>Back to invoice</Button>
          {conflict ? <Button variant="secondary" onClick={refresh}>Refresh invoice</Button>
            : review.status === 'error' && !forbidden && <Button variant="secondary" onClick={retry}>Retry invoice check</Button>}
          <Button variant={selected === 'cancel' ? 'danger' : 'primary'} disabled>{selected === 'confirm' ? 'Confirm invoice' : 'Cancel invoice'} (unavailable)</Button>
        </div>
      </>}
    </dialog>
  </section>;
}
