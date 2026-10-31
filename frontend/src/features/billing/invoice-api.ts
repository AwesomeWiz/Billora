import { api, ApiError } from '../../lib/api';
import { currency, date, identifier, minor, pageNumber, pageSize, parsePage, record, text } from '../customer/records';

export const invoiceStatuses = ['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'] as const;
export type InvoiceStatus = typeof invoiceStatuses[number];
export const paymentStatuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as const;
export type InvoicePaymentStatus = typeof paymentStatuses[number];
export interface InvoiceBillingAccount { id?: string; display_name?: string; billing_email?: string; billing_address?: string }
export interface InvoiceSummary {
  id: string; number: string; billing_account_id: string; issued_on: string; due_on: string;
  status: InvoiceStatus; currency: string; total_minor: number; paid_minor?: number; balance_minor?: number;
  subtotal_minor?: number; discount_minor?: number; tax_minor?: number;
  billing_account?: InvoiceBillingAccount; payment_status?: InvoicePaymentStatus;
}

export function invalidInvoice(): never {
  throw new ApiError(0, 'UNSUPPORTED_INVOICE_CONTRACT', 'The invoice service returned an unsupported or inconsistent financial record. Please contact the integration owner.');
}
export function optionalText(value: unknown): string | undefined { return value == null || value === '' ? undefined : text(value); }
export function optionalMinor(value: unknown): number | undefined { return value == null ? undefined : minor(value); }
export function parseBillingAccount(value: unknown, accountId: string): InvoiceBillingAccount | undefined {
  if (value == null) return undefined;
  const body = record(value);
  const id = body.id == null ? undefined : identifier(body.id);
  if (id !== undefined && id !== accountId) return invalidInvoice();
  return { id, display_name: optionalText(body.display_name), billing_email: optionalText(body.billing_email), billing_address: optionalText(body.billing_address) };
}

/** Architecture §4.2/§5.2. Optional projections remain local until DTO coordination. */
export function parseInvoiceSummary(value: unknown): InvoiceSummary {
  const body = record(value);
  if (!invoiceStatuses.includes(body.status as InvoiceStatus) ||
    (body.payment_status != null && !paymentStatuses.includes(body.payment_status as InvoicePaymentStatus))) return invalidInvoice();
  const accountId = identifier(body.billing_account_id);
  const invoice: InvoiceSummary = {
    id: identifier(body.id), number: text(body.number), billing_account_id: accountId,
    issued_on: date(body.issued_on), due_on: date(body.due_on), status: body.status as InvoiceStatus, currency: currency(body.currency),
    total_minor: minor(body.total_minor), paid_minor: optionalMinor(body.paid_minor), balance_minor: optionalMinor(body.balance_minor),
    subtotal_minor: optionalMinor(body.subtotal_minor), discount_minor: optionalMinor(body.discount_minor), tax_minor: optionalMinor(body.tax_minor),
    billing_account: parseBillingAccount(body.billing_account, accountId), payment_status: body.payment_status == null ? undefined : body.payment_status as InvoicePaymentStatus,
  };
  const { status, total_minor: total, paid_minor: paid, balance_minor: balance, payment_status: payment } = invoice;
  if (paid !== undefined && paid > total) return invalidInvoice();
  if (balance !== undefined && balance > total) return invalidInvoice();
  // Check consistency of supplied values only. Never calculate a missing balance or total.
  if (status !== 'CANCELLED' && paid !== undefined && balance !== undefined && BigInt(paid) + BigInt(balance) !== BigInt(total)) return invalidInvoice();
  if (status === 'PAID' && ((paid !== undefined && paid !== total) || (balance !== undefined && balance !== 0) || (payment !== undefined && payment !== 'PAID'))) return invalidInvoice();
  if ((status === 'DRAFT' || status === 'CANCELLED') && paid !== undefined && paid > 0) return invalidInvoice();
  if (payment === 'PAID' && status !== 'PAID') return invalidInvoice();
  if ((payment === 'PARTIALLY_PAID' || payment === 'OVERDUE') && status !== 'CONFIRMED') return invalidInvoice();
  if (payment === 'PARTIALLY_PAID' && ((paid !== undefined && (paid <= 0 || paid >= total)) || balance === 0)) return invalidInvoice();
  if (payment === 'OVERDUE' && (balance === 0 || (paid !== undefined && paid === total))) return invalidInvoice();
  if (payment === 'UNPAID' && ((paid !== undefined && paid > 0) || status === 'PAID')) return invalidInvoice();
  if (invoice.subtotal_minor !== undefined && invoice.discount_minor !== undefined && invoice.discount_minor > invoice.subtotal_minor) return invalidInvoice();
  if (invoice.subtotal_minor !== undefined && invoice.discount_minor !== undefined && invoice.tax_minor !== undefined &&
    BigInt(invoice.subtotal_minor) - BigInt(invoice.discount_minor) + BigInt(invoice.tax_minor) !== BigInt(total)) return invalidInvoice();
  return invoice;
}

export function invoiceListQuery(params: URLSearchParams): string {
  const result = new URLSearchParams({ page: String(pageNumber(params.get('page'))), page_size: String(pageSize(params.get('page_size'))), sort: 'created_at_desc' });
  const status = params.get('status');
  const search = params.get('search')?.trim();
  const due = params.get('due_on');
  if (status) {
    if (!invoiceStatuses.includes(status as InvoiceStatus)) throw new ApiError(0, 'INVALID_FILTER', 'Choose a supported invoice status. Overdue and partially paid are payment indicators, not invoice lifecycle states.');
    result.set('status', status);
  }
  if (search) {
    if (search.length > 200) throw new ApiError(0, 'INVALID_FILTER', 'Use at most 200 characters for invoice search.');
    result.set('search', search);
  }
  if (due) {
    try { date(due); } catch { throw new ApiError(0, 'INVALID_FILTER', 'Enter a valid due date in YYYY-MM-DD format.'); }
    result.set('due_on', due);
  }
  return result.toString();
}

export const invoiceApi = {
  async list(filters: string, signal?: AbortSignal) {
    const query = invoiceListQuery(new URLSearchParams(filters));
    const page = parsePage(await api.get<unknown>(`/invoices?${query}`, { signal }), parseInvoiceSummary);
    if (new Set(page.items.map(item => item.id)).size !== page.items.length) return invalidInvoice();
    return page;
  },
};
