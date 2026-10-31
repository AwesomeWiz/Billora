import { api, ApiError } from '../../lib/api';
import { currency, date, minor, record } from '../customer/records';

/** Architecture §7.3; local until reporting Pydantic/OpenAPI DTOs are published. */
export interface FinancialSummary {
  currency: string; range: { from: string; to: string }; active_subscriptions: number;
  collected_minor: number; confirmed_invoiced_minor: number; outstanding_minor: number;
  overdue_count: number; overdue_minor: number;
}

export function parseFinancialSummary(value: unknown): FinancialSummary {
  try {
    const body = record(value); const range = record(body.range);
    if (body.currency === undefined) throw new Error('Missing currency');
    const from = date(range.from); const to = date(range.to);
    if (from > to) throw new Error('Reversed range');
    return {
      currency: currency(body.currency), range: { from, to }, active_subscriptions: minor(body.active_subscriptions),
      collected_minor: minor(body.collected_minor), confirmed_invoiced_minor: minor(body.confirmed_invoiced_minor),
      outstanding_minor: minor(body.outstanding_minor), overdue_count: minor(body.overdue_count), overdue_minor: minor(body.overdue_minor),
    };
  } catch {
    throw new ApiError(0, 'UNSUPPORTED_SUMMARY_CONTRACT', 'The reporting service did not supply a complete, valid financial summary. Missing amounts are not treated as zero.');
  }
}

export const summaryApi = {
  async get(signal?: AbortSignal) {
    // No date-query field names have been agreed; use only the service's returned range.
    return parseFinancialSummary(await api.get<unknown>('/reports/summary', { signal }));
  },
};
