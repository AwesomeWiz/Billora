import { api } from '../../lib/api';
import { identifier, parsePage, record } from '../customer/records';
import { invalidInvoice } from './invoice-api';
import { parseInvoicePayment } from './invoice-detail-api';

/** Architecture §7.1/7.2 standard collection convention; confirm DTO before live use. */
export const paymentHistoryApi = {
  async list(invoiceId: string, page: number, pageSize: number, signal?: AbortSignal) {
    identifier(invoiceId);
    if (!Number.isSafeInteger(page) || page < 1 || ![20, 25, 50].includes(pageSize)) return invalidInvoice();
    const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const result = parsePage(await api.get<unknown>(`/invoices/${invoiceId}/payments?${query}`, { signal }), value => {
      // Independent history rows must identify the parent, not just inherit it from the URL.
      if (identifier(record(value).invoice_id) !== invoiceId) return invalidInvoice();
      return parseInvoicePayment(value, invoiceId);
    });
    if (result.page !== page || result.page_size !== pageSize || new Set(result.items.map(payment => payment.id)).size !== result.items.length) return invalidInvoice();
    return result;
  },
};
