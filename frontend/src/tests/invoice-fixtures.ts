import type { InvoiceSummary } from '../features/billing/invoice-api';

/** Test-only records; never imported by application modules. */
export const invoiceFixture: InvoiceSummary = {
  id: 'invoice-1', number: 'INV-000001', billing_account_id: 'account-1', issued_on: '2026-10-31', due_on: '2026-11-14',
  status: 'CONFIRMED', currency: 'INR', subtotal_minor: 100000, discount_minor: 10000, tax_minor: 16200,
  total_minor: 106200, paid_minor: 20000, balance_minor: 86200,
  billing_account: { id: 'account-1', display_name: 'Test customer', billing_email: 'billing@example.test', billing_address: 'Test billing address' },
};
export const invoiceJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
export const invoicePage = (items: unknown[] = [invoiceFixture], extra = {}) => ({ items, total: items.length, page: 1, page_size: 20, has_next: false, ...extra });
