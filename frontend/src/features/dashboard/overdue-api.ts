import { api, ApiError } from '../../lib/api';
import { parseInvoiceSummary } from '../billing/invoice-api';
import { parsePage } from '../customer/records';

export function overduePagination(params: URLSearchParams): { page: number; pageSize: number } {
  for (const name of params.keys()) {
    if (!['page', 'page_size'].includes(name) || params.getAll(name).length !== 1) throw new ApiError(0, 'UNSUPPORTED_REPORT_FILTER', 'These report filters are not supported yet. Reset filters to view the service’s unfiltered report.');
  }
  const rawPage = params.get('page') ?? '1'; const rawSize = params.get('page_size') ?? '20';
  const page = Number(rawPage);
  if (!/^[1-9]\d*$/.test(rawPage) || !Number.isSafeInteger(page) || !['20', '25', '50'].includes(rawSize)) throw new ApiError(0, 'INVALID_REPORT_PAGE', 'Choose a valid report page and 20, 25 or 50 rows per page.');
  return { page, pageSize: Number(rawSize) };
}

/** Invoice entities + standard collection envelope; no separate overdue DTO has been published. */
export const overdueApi = {
  async list(page: number, pageSize: number, signal?: AbortSignal) {
    overduePagination(new URLSearchParams({ page: String(page), page_size: String(pageSize) }));
    const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const value = await api.get<unknown>(`/reports/overdue?${query}`, { signal });
    try {
      const result = parsePage(value, parseInvoiceSummary);
      if (result.page !== page || result.page_size !== pageSize || new Set(result.items.map(invoice => invoice.id)).size !== result.items.length ||
        result.items.some(invoice => invoice.status !== 'CONFIRMED' || invoice.balance_minor === undefined || invoice.balance_minor <= 0)) throw new Error('Not collectible overdue invoices');
      // The endpoint establishes overdue membership. Do not reinterpret it with the device clock.
      return result;
    } catch {
      throw new ApiError(0, 'UNSUPPORTED_OVERDUE_CONTRACT', 'The service returned an unsupported overdue report. Collectible invoice references and server balances are required; no missing amounts are calculated.');
    }
  },
};
