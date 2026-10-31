import { act, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { formatMoney } from '../lib/format';
import { invoiceFixture, invoiceJson as json } from './invoice-fixtures';

const line = { id: 'line-1', description: 'Agreed support seats', variant_id: 'variant-1', variant_description: 'Odoo brand · agreed variant', source_subscription_id: 'subscription-1', quantity: 2, unit_price_minor: 50000, line_subtotal_minor: 100000, discount_minor: 10000, tax_bps: 1800, tax_minor: 16200, total_minor: 106200 };
const payment = { id: 'payment-1', invoice_id: 'invoice-1', amount_minor: 20000, method: 'BANK_TRANSFER', paid_at: '2026-10-31T09:00:00Z', note: 'Customer reference supplied' };
const detail = { ...invoiceFixture, lines: [line], payments: [payment] };
function open(path = '/app/invoices/invoice-1') {
  const router = createMemoryRouter([{ path: '/app/invoices/:id', element: <InvoiceDetailPage /> }], { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
beforeEach(() => { vi.spyOn(authService, 'session').mockResolvedValue({ user: { id: 'test-staff', email: 'staff@example.test', role: 'STAFF' }, csrf_token: 'test-only-csrf' }); });

describe('invoice detail snapshots', () => {
  it('shows loading and renders identity, historical billing details and linked subscription references', async () => {
    let finish!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    open(); expect(screen.getByRole('status', { name: 'Loading invoice details' })).toBeInTheDocument();
    await act(async () => finish(json(detail)));
    expect(await screen.findByRole('heading', { name: 'INV-000001' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Billora home' })).toHaveAttribute('href', '/app/invoices');
    const billing = screen.getByRole('region', { name: 'Customer billing details' });
    expect(within(billing).getByText('Test customer')).toBeInTheDocument();
    expect(within(billing).getByText('billing@example.test')).toBeInTheDocument();
    expect(within(billing).getByText('Test billing address')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'subscription-1' })).toHaveAttribute('href', '/app/subscriptions/subscription-1');
    expect(screen.getByText('31 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('14 Nov 2026')).toBeInTheDocument();
  });

  it('renders agreed unit prices, discounts, taxes and totals without requesting current catalog/account data', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(detail)); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    const lines = screen.getByRole('table', { name: 'Invoice line items' });
    expect(within(lines).getByRole('cell', { name: /Agreed support seats/ })).toHaveTextContent('Odoo brand · agreed variant');
    expect(within(lines).getByRole('cell', { name: '2' })).toBeInTheDocument();
    expect(within(lines).getByRole('cell', { name: '₹500.00' })).toBeInTheDocument();
    expect(within(lines).getByRole('cell', { name: /₹162.00/ })).toHaveTextContent('18% snapshot rate');
    const totals = screen.getByRole('region', { name: 'Financial breakdown' });
    for (const amount of ['₹1,000.00', '₹100.00', '₹162.00', '₹1,062.00']) expect(within(totals).getByText(amount)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe('/api/invoices/invoice-1');
    expect(fetcher.mock.calls[0][1]?.method).toBe('GET');
    for (const button of screen.queryAllByRole('button', { name: /^(Confirm|Cancel|Send|Record payment)/i })) expect(button).toBeDisabled();
  });

  it('renders recorded payments and the supplied settlement values in the invoice currency', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(detail)); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    const history = screen.getByRole('table', { name: 'Recorded invoice payments' });
    expect(within(history).getByText('BANK TRANSFER')).toBeInTheDocument();
    expect(within(history).getByText('₹200.00')).toBeInTheDocument();
    expect(within(history).getByText('Customer reference supplied')).toBeInTheDocument();
    expect(within(history).getByText(/31 Oct 2026/)).toHaveAttribute('datetime', payment.paid_at);
    const summary = screen.getByRole('region', { name: 'Payment summary' });
    expect(within(summary).getByText('Partially paid')).toBeInTheDocument();
    expect(within(summary).getByText('₹862.00')).toBeInTheDocument();
  });

  it('uses the shared formatter for a server-provided currency', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...detail, currency: 'USD' })); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    expect(within(screen.getByRole('region', { name: 'Financial breakdown' })).getByText(formatMoney(106200, 'USD'))).toBeInTheDocument();
    expect(screen.queryByText('₹1,062.00')).not.toBeInTheDocument();
  });

  it('keeps optional snapshots, billing details, payment history and balances unavailable rather than inventing values', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...invoiceFixture, billing_account: undefined, paid_minor: undefined, balance_minor: undefined, subtotal_minor: undefined, discount_minor: undefined, tax_minor: undefined })); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    expect(screen.getByText('Billing address not provided')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Invoice lines unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payment entries unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Financial breakdown' })).getByText('₹1,062.00')).toBeInTheDocument();
  });

  it('distinguishes explicit empty arrays from missing snapshots without using them to settle the invoice', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...detail, lines: [], payments: [] })); open();
    await screen.findByRole('heading', { name: 'No invoice lines returned' });
    expect(screen.getByRole('heading', { name: 'No payment entries returned' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Payment summary' })).getByText('Partially paid')).toBeInTheDocument();
    expect(screen.queryByText('Invoice lines unavailable')).not.toBeInTheDocument();
  });

  it('does not calculate missing line amounts from quantity and unit price or paid totals from payment entries', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...detail, paid_minor: undefined, balance_minor: undefined,
      lines: [{ id: 'line-1', description: 'Sparse snapshot', quantity: 2, unit_price_minor: 50000 }] })); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    const lines = screen.getByRole('table', { name: 'Invoice line items' });
    expect(within(lines).getAllByRole('cell', { name: 'Not provided' })).toHaveLength(4);
    expect(within(screen.getByRole('region', { name: 'Payment summary' })).queryByText('₹200.00')).not.toBeInTheDocument();
    expect(within(lines).queryByRole('cell', { name: '₹1,000.00' })).not.toBeInTheDocument();
  });

  it.each(['DRAFT', 'CANCELLED'])('treats %s as noncollectible and keeps draft totals provisional', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...detail, status, paid_minor: 0, balance_minor: 106200, payments: [] })); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    if (status === 'DRAFT') expect(screen.getByText('This is a draft. Amounts may change before the invoice is confirmed.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Payment summary' })).getByText('Not collectible')).toBeInTheDocument();
  });

  it.each([403, 404, 500])('renders HTTP %s without invoice data or financial controls', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, status)); open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it.each([
    { ...detail, id: 'other-invoice' },
    { ...detail, billing_account: { ...invoiceFixture.billing_account, id: 'other-account' } },
    { ...detail, lines: [{ ...line, unit_price_minor: 1.5 }] },
    { ...detail, lines: [{ ...line, discount_minor: 200000, tax_minor: 206200 }] },
    { ...detail, payments: [{ ...payment, invoice_id: 'other-invoice' }] },
    { ...detail, payments: [{ ...payment, paid_at: 'not-a-timestamp' }] },
    { ...detail, lines: [line, line] },
    { ...detail, payment_status: 'PAID' },
  ])('rejects mismatched identity, malformed money/history or contradictory payment state (%j)', async invalid => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(invalid)); open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('does not retain another invoice when navigating before an older response completes', async () => {
    let finishOld!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
      .mockImplementation(async () => json({ ...detail, id: 'invoice-2', number: 'INV-000002', payments: [] }));
    const router = open();
    await act(async () => { await router.navigate('/app/invoices/invoice-2'); });
    await screen.findByRole('heading', { name: 'INV-000002' });
    await act(async () => finishOld(json(detail)));
    expect(screen.queryByRole('heading', { name: 'INV-000001' })).not.toBeInTheDocument();
  });
});
