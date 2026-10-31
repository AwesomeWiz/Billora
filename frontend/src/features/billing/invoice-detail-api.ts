import { api } from '../../lib/api';
import { date, identifier, minor, record, text } from '../customer/records';
import { invalidInvoice, optionalMinor, optionalText, parseInvoiceSummary, type InvoiceSummary } from './invoice-api';

export interface InvoiceSnapshotLine {
  id: string; description: string; quantity: number; unit_price_minor: number;
  source_subscription_id?: string; variant_id?: string; variant_description?: string;
  line_subtotal_minor?: number; discount_minor?: number; tax_bps?: number; tax_minor?: number; total_minor?: number;
}
export interface InvoicePayment { id: string; amount_minor: number; method: string; paid_at: string; note?: string }
export interface InvoiceDetail extends InvoiceSummary { lines?: InvoiceSnapshotLine[]; payments?: InvoicePayment[] }

function parseLine(value: unknown): InvoiceSnapshotLine {
  const body = record(value);
  const quantity = minor(body.quantity);
  const taxBps = optionalMinor(body.tax_bps);
  if (quantity < 1 || (taxBps !== undefined && taxBps > 10000)) return invalidInvoice();
  const line: InvoiceSnapshotLine = {
    id: identifier(body.id), description: text(body.description), quantity, unit_price_minor: minor(body.unit_price_minor),
    source_subscription_id: body.source_subscription_id == null ? undefined : identifier(body.source_subscription_id),
    variant_id: body.variant_id == null ? undefined : identifier(body.variant_id), variant_description: optionalText(body.variant_description),
    line_subtotal_minor: optionalMinor(body.line_subtotal_minor), discount_minor: optionalMinor(body.discount_minor),
    tax_bps: taxBps, tax_minor: optionalMinor(body.tax_minor), total_minor: optionalMinor(body.total_minor),
  };
  // Validate supplied snapshots without rebuilding prices, tax, or invoice totals.
  if (line.line_subtotal_minor !== undefined && line.discount_minor !== undefined && line.discount_minor > line.line_subtotal_minor) return invalidInvoice();
  if (line.line_subtotal_minor !== undefined && line.discount_minor !== undefined && line.tax_minor !== undefined && line.total_minor !== undefined &&
    BigInt(line.line_subtotal_minor) - BigInt(line.discount_minor) + BigInt(line.tax_minor) !== BigInt(line.total_minor)) return invalidInvoice();
  return line;
}

function parsePayment(value: unknown, invoiceId: string): InvoicePayment {
  const body = record(value);
  if (body.invoice_id != null && identifier(body.invoice_id) !== invoiceId) return invalidInvoice();
  const amount = minor(body.amount_minor);
  const paidAt = text(body.paid_at);
  if (amount <= 0 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(paidAt) || Number.isNaN(Date.parse(paidAt))) return invalidInvoice();
  date(paidAt.slice(0, 10));
  return { id: identifier(body.id), amount_minor: amount, method: text(body.method), paid_at: paidAt, note: optionalText(body.note) };
}

function optionalItems<T extends { id: string }>(value: unknown, parse: (item: unknown) => T): T[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return invalidInvoice();
  const items = value.map(parse);
  return new Set(items.map(item => item.id)).size === items.length ? items : invalidInvoice();
}

/** Detail arrays, variant and bill-to projections await backend DTO coordination. */
export function parseInvoiceDetail(value: unknown): InvoiceDetail {
  const body = record(value);
  const invoice = parseInvoiceSummary(body);
  return { ...invoice, lines: optionalItems(body.lines, parseLine), payments: optionalItems(body.payments, payment => parsePayment(payment, invoice.id)) };
}

export const invoiceDetailApi = {
  async detail(id: string, signal?: AbortSignal) {
    const invoice = parseInvoiceDetail(await api.get<unknown>('/invoices/' + identifier(id), { signal }));
    return invoice.id === id ? invoice : invalidInvoice();
  },
};
