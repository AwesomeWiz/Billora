import type { FinancialSummary } from '../features/dashboard/summary-api';

/** Test-only fixtures. No application module imports these financial records. */
export const reportSummary: FinancialSummary = {
  currency: 'INR', range: { from: '2026-10-01', to: '2026-10-31' }, active_subscriptions: 37,
  collected_minor: 123456, confirmed_invoiced_minor: 298765, outstanding_minor: 98765,
  overdue_count: 3, overdue_minor: 25000,
};
export const reportJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
