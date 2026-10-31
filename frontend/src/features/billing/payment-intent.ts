import type { Role } from '../auth/contract';
import { date } from '../customer/records';
import type { InvoiceDetail } from './invoice-detail-api';

export const paymentSubmissionBlocker = 'Payment submission is unavailable: supported methods, the payment result contract, and idempotent replay/reconciliation must be confirmed by the backend owner. Nothing has been recorded.';

export function paymentRecordingBlocker(invoice: InvoiceDetail, role: Role | undefined): string | null {
  if (role !== 'ADMIN' && role !== 'STAFF') return 'Only administrators and staff may record payments.';
  if (invoice.status !== 'CONFIRMED') return 'Only collectible confirmed invoices can receive payments. Draft, cancelled and paid invoices are not eligible.';
  if (invoice.paid_minor === undefined || invoice.balance_minor === undefined) return 'The service must supply both the recorded paid amount and outstanding balance before a payment can be reviewed.';
  if (invoice.balance_minor <= 0 || invoice.paid_minor >= invoice.total_minor) return 'This invoice has no collectible balance. Refresh its server settlement state before continuing.';
  if (invoice.currency !== 'INR') return 'Manual recording for this currency requires a confirmed currency precision contract. The current baseline supports INR only.';
  return null;
}

export class PaymentDraftError extends Error {
  constructor(public field: 'amount' | 'paidAt' | 'note' | 'general', message: string) { super(message); }
}

/** Parse decimal INR text to integer paise without binary floating-point arithmetic. */
export function paymentAmountMinor(value: string): number {
  const normalized = value.trim();
  if (normalized.length > 20 || !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) throw new PaymentDraftError('amount', 'Enter a positive INR amount with at most two decimal places, without commas or exponent notation.');
  const [whole, fraction = ''] = normalized.split('.');
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new PaymentDraftError('amount', 'Enter a positive amount within the supported integer range.');
  return Number(amount);
}

export interface PaymentReviewDraft { invoiceId: string; currency: 'INR'; amountMinor: number; paidAt: string; note: string }
export function validatePaymentDraft(invoice: InvoiceDetail, role: Role | undefined, input: { amount: string; paidAtLocal: string; note: string }): PaymentReviewDraft {
  const blocker = paymentRecordingBlocker(invoice, role);
  if (blocker) throw new PaymentDraftError('general', blocker);
  const amount = paymentAmountMinor(input.amount);
  if (amount > invoice.balance_minor!) throw new PaymentDraftError('amount', 'The amount exceeds the service-reported outstanding balance. Refresh before reviewing a different amount.');
  const local = input.paidAtLocal;
  try { date(local.slice(0, 10)); } catch { throw new PaymentDraftError('paidAt', 'Enter a valid payment date and time in IST.'); }
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(local)) throw new PaymentDraftError('paidAt', 'Enter a valid payment date and time in IST.');
  const paidAt = new Date(local + ':00+05:30').toISOString();
  if (input.note.length > 500) throw new PaymentDraftError('note', 'Use at most 500 characters for the payment note.');
  return { invoiceId: invoice.id, currency: 'INR', amountMinor: amount, paidAt, note: input.note.trim() };
}

export interface PaymentPreparation { key: string; fingerprint: string; draft: PaymentReviewDraft }
/** In-memory, unsubmitted preparation. Rechecks retain the key; edits require explicit review. */
export function preparePayment(previous: PaymentPreparation | null, draft: PaymentReviewDraft): PaymentPreparation {
  const fingerprint = JSON.stringify([draft.invoiceId, draft.currency, draft.amountMinor, draft.paidAt, draft.note, null /* method unconfirmed */]);
  return previous?.fingerprint === fingerprint ? previous : { key: crypto.randomUUID(), fingerprint, draft };
}
