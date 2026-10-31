import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button, Input, Money, Select } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import { formatDate, formatMoney } from '../../lib/format';
import { useAuth } from '../auth/AuthProvider';
import { sameInvoiceSnapshot } from './invoice-actions';
import { invoiceDetailApi, type InvoiceDetail } from './invoice-detail-api';
import { PaymentDraftError, paymentRecordingBlocker, paymentSubmissionBlocker, preparePayment, validatePaymentDraft, type PaymentPreparation } from './payment-intent';

type PaymentReview = { status: 'loading'; intent: PaymentPreparation }
  | { status: 'ready' | 'changed'; intent: PaymentPreparation; latest: InvoiceDetail }
  | { status: 'error'; intent: PaymentPreparation; error: unknown };

export function PaymentRecording({ invoice, onRefresh }: { invoice: InvoiceDetail; onRefresh: () => void }) {
  const { state } = useAuth();
  const role = state.user?.role;
  const dialog = useRef<HTMLDialogElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const checking = useRef(false);
  const preparation = useRef<PaymentPreparation | null>(null);
  const [amount, setAmount] = useState('');
  const [paidAtLocal, setPaidAtLocal] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<PaymentDraftError | null>(null);
  const [review, setReview] = useState<PaymentReview | null>(null);
  const titleId = useId(); const descriptionId = useId(); const blockerId = useId();
  const open = review !== null;
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  useEffect(() => () => controller.current?.abort(), []);
  if (role !== 'ADMIN' && role !== 'STAFF') return null;
  const blocker = paymentRecordingBlocker(invoice, role);

  function dismiss() { controller.current?.abort(); checking.current = false; setReview(null); }
  function refresh() { dismiss(); onRefresh(); }
  async function check(intent: PaymentPreparation) {
    if (checking.current) return;
    checking.current = true;
    const request = new AbortController(); controller.current = request;
    setReview({ status: 'loading', intent });
    try {
      const latest = await invoiceDetailApi.detail(invoice.id, request.signal);
      if (!request.signal.aborted) setReview({ status: sameInvoiceSnapshot(invoice, latest) ? 'ready' : 'changed', intent, latest });
    } catch (err) {
      if (!request.signal.aborted) setReview({ status: 'error', intent, error: err });
    } finally { if (controller.current === request) checking.current = false; }
  }
  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (review || checking.current || blocker) return;
    try {
      const draft = validatePaymentDraft(invoice, role, { amount, paidAtLocal, note });
      preparation.current = preparePayment(preparation.current, draft);
      setError(null); void check(preparation.current);
    } catch (err) {
      const failure = err instanceof PaymentDraftError ? err : new PaymentDraftError('general', 'A payment review could not be prepared. No payment was submitted.');
      setError(failure);
      if (failure.field === 'amount') amountInput.current?.focus();
      else if (failure.field === 'paidAt') dateInput.current?.focus();
      else if (failure.field === 'note') noteInput.current?.focus();
    }
  }
  const latest = review?.status === 'ready' || review?.status === 'changed' ? review.latest : null;
  const conflict = review?.status === 'changed' || (review?.status === 'error' && review.error instanceof ApiError && review.error.status === 409);
  const forbidden = review?.status === 'error' && review.error instanceof ApiError && review.error.status === 403;

  return <section className="card payment-recording no-print" aria-label="Manual payment recording">
    <h2>Record a payment</h2>
    <p className="muted">Reconcile a known offline payment for {invoice.number}. This form does not process cards or connect to a payment gateway.</p>
    <p id={blockerId} className="invoice-contract-note">{paymentSubmissionBlocker}</p>
    {blocker ? <p className="notice notice-warning">{blocker}</p> : <form onSubmit={submitReview} noValidate aria-label="Prepare manual payment">
      <div className="payment-form-grid">
        <Input label="Invoice reference" value={invoice.number} readOnly />
        <Input label="Service-reported outstanding (INR)" value={invoice.balance_minor === undefined ? 'Not provided' : formatMoney(invoice.balance_minor, invoice.currency)} readOnly />
        <Input ref={amountInput} label="Payment amount (INR)" inputMode="decimal" required maxLength={20} value={amount} disabled={open}
          onChange={event => setAmount(event.target.value)} error={error?.field === 'amount' ? error.message : undefined} hint="Enter rupees and paise. Final eligibility and balance must be checked by the server." />
        <Select label="Payment method" value="" disabled hint="Supported payment methods have not been confirmed by the service."><option value="">Methods unavailable</option></Select>
        <Input ref={dateInput} label="Payment date and time (IST)" type="datetime-local" required value={paidAtLocal} disabled={open}
          onChange={event => setPaidAtLocal(event.target.value)} error={error?.field === 'paidAt' ? error.message : undefined} hint="Asia/Kolkata. Review shows the same payment instant; the request uses UTC once integration is enabled." />
        <Input label="Payment reference" disabled value="" hint="Reference entry awaits a confirmed request field. Supplied historical references remain readable." />
        <Input ref={noteInput} label="Payment note (optional)" value={note} disabled={open} maxLength={500} onChange={event => setNote(event.target.value)} error={error?.field === 'note' ? error.message : undefined} />
      </div>
      {error && <p className="field-error" role="alert">{error.message}</p>}
      <Button type="submit" variant="secondary" disabled={open} aria-describedby={blockerId}>Review payment</Button>
    </form>}
    <dialog ref={dialog} className="record-dialog payment-review-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); dismiss(); }}>
      {review && <>
        <h2 id={titleId}>Review payment for {invoice.number}</h2>
        <p id={descriptionId} className="muted">This is an unsubmitted preparation. Review does not record a payment or reserve the balance.</p>
        <dl className="invoice-review-totals">
          <div><dt>Payment amount</dt><dd><Money amountMinor={review.intent.draft.amountMinor} currency={review.intent.draft.currency} /></dd></div>
          <div><dt>Method</dt><dd>Unavailable — awaiting confirmation</dd></div>
          <div><dt>Payment date (IST)</dt><dd><time dateTime={review.intent.draft.paidAt}>{formatDate(review.intent.draft.paidAt, { hour: '2-digit', minute: '2-digit' })}</time></dd></div>
          <div><dt>Note</dt><dd>{review.intent.draft.note || 'Not provided'}</dd></div>
          {latest && <div><dt>Latest server outstanding</dt><dd>{latest.balance_minor === undefined ? 'Not provided' : <Money amountMinor={latest.balance_minor} currency={latest.currency} />}</dd></div>}
        </dl>
        {review.status === 'loading' && <p role="status">Checking the invoice’s current balance…</p>}
        {review.status === 'error' && <p className="notice notice-error" role="alert">{errorMessage(review.error)} No payment was submitted. Retrying this check only reads the invoice.</p>}
        {conflict && <p className="notice notice-warning" role="alert">The invoice changed or the service reported a conflict. Refresh the invoice and history before another review. No new payment intent or success is assumed.</p>}
        {latest && (paymentRecordingBlocker(latest, role) || (latest.balance_minor !== undefined && review.intent.draft.amountMinor > latest.balance_minor)) && <p role="alert">This payment can no longer be reviewed against the latest balance or invoice state. Refresh before continuing.</p>}
        <p className="invoice-contract-note" id={blockerId + '-review'}>{paymentSubmissionBlocker}</p>
        <div className="record-inline"><Button variant="secondary" autoFocus onClick={dismiss}>Back to payment form</Button>
          {conflict ? <Button variant="secondary" onClick={refresh}>Refresh invoice and history</Button>
            : review.status === 'error' && !forbidden && <Button variant="secondary" onClick={() => void check(review.intent)}>Retry balance check</Button>}
          <Button disabled aria-describedby={blockerId + '-review'}>Record payment (unavailable)</Button>
        </div>
      </>}
    </dialog>
  </section>;
}
