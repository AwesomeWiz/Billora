import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage';
import { invoiceFixture, invoiceJson as json } from './invoice-fixtures';

const payment = { id: 'payment-history-1', invoice_id: 'invoice-1', amount_minor: 20000, method: 'BANK_TRANSFER', paid_at: '2026-10-31T09:00:00Z', external_ref: 'BANK-REF-TEST', note: 'Test reconciliation' };
const page = (items: unknown[] = [payment], extra = {}) => ({ items, total: items.length, page: 1, page_size: 20, has_next: false, ...extra });
const session = { user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-csrf' };
function open(full = false) {
  const router = createMemoryRouter(full ? routeConfig : [{ path: '/app/invoices/:id', element: <InvoiceDetailPage /> }], { initialEntries: ['/app/invoices/invoice-1'] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
async function viewHistory() { await userEvent.click(await screen.findByRole('button', { name: 'View payment history' }, { timeout: 3000 })); }
beforeEach(() => { vi.spyOn(authService, 'session').mockResolvedValue(session); });

describe('invoice-scoped payment history', () => {
  it.each(['ADMIN', 'STAFF'] as const)('loads history on demand for %s with cookies and displays server reference/notes', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => json(String(input).includes('/payments?') ? page() : invoiceFixture));
    open(true);
    await screen.findByRole('button', { name: 'View payment history' }, { timeout: 3000 });
    expect(fetcher).toHaveBeenCalledOnce();
    await viewHistory();
    const history = await screen.findByRole('table', { name: 'Invoice payment history' });
    for (const value of ['₹200.00', 'BANK TRANSFER', 'BANK-REF-TEST', 'Test reconciliation']) expect(within(history).getByText(value)).toBeInTheDocument();
    expect(within(history).getByText(/31 Oct 2026/)).toHaveAttribute('datetime', payment.paid_at);
    expect(fetcher).toHaveBeenLastCalledWith('/api/invoices/invoice-1/payments?page=1&page_size=20', expect.objectContaining({ method: 'GET', credentials: 'include' }));
    expect(screen.queryByRole('link', { name: 'Payments' })).not.toBeInTheDocument();
  });

  it('shows loading distinctly, then empty response without resetting the invoice balance', async () => {
    let finish!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(input => String(input).includes('/payments?') ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(json(invoiceFixture)));
    open(); await viewHistory();
    expect(screen.getByRole('status', { name: 'Loading invoice payment history' })).toBeInTheDocument();
    await act(async () => finish(json(page([]))));
    expect(await screen.findByRole('heading', { name: 'No payment entries in this response' })).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Payment summary' });
    expect(within(summary).getByText('₹862.00')).toBeInTheDocument();
    expect(within(summary).getByText('Partially paid')).toBeInTheDocument();
  });

  it.each([403, 404, 409, 503])('keeps HTTP %s separate from empty history', async status => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input).includes('/payments?') ? json({}, status) : json(invoiceFixture));
    open(); await viewHistory();
    const history = screen.getByRole('region', { name: 'Payment history' });
    const alert = await within(history).findByRole('alert');
    if (status === 403) {
      expect(alert).toHaveTextContent('Payment history access denied');
      expect(within(history).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    }
    if (status === 404) expect(alert).toHaveTextContent('Payment history unavailable');
    if (status === 409) expect(alert).toHaveTextContent('Payment history changed');
    expect(within(history).queryByRole('heading', { name: 'No payment entries in this response' })).not.toBeInTheDocument();
  });

  it('retries a network failure explicitly using only safe GETs', async () => {
    let attempts = 0;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (!String(input).includes('/payments?')) return json(invoiceFixture);
      if (++attempts === 1) throw new TypeError('Network down');
      return json(page());
    });
    open(); await viewHistory();
    await screen.findByRole('heading', { name: 'Unable to load payment history' });
    expect(attempts).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Invoice payment history' })).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('uses server pagination and resets page when the page size changes', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input), 'http://localhost');
      if (!url.pathname.endsWith('/payments')) return json(invoiceFixture);
      const current = Number(url.searchParams.get('page')); const size = Number(url.searchParams.get('page_size'));
      return json(page([{ ...payment, id: 'payment-page-' + current }], { page: current, page_size: size, total: 21, has_next: current === 1 }));
    });
    open(); await viewHistory(); await screen.findByRole('table', { name: 'Invoice payment history' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('payment-page-2')).toBeInTheDocument();
    expect(screen.queryByText('payment-page-1')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    expect(await screen.findByText('payment-page-1')).toBeInTheDocument();
    expect(fetcher).toHaveBeenLastCalledWith('/api/invoices/invoice-1/payments?page=1&page_size=50', expect.anything());
  });

  it.each([
    [payment, payment], [{ ...payment, invoice_id: 'other-invoice' }], [{ ...payment, invoice_id: undefined }],
    [{ ...payment, amount_minor: 0 }], [{ ...payment, amount_minor: 0.5 }], [{ ...payment, paid_at: '2026-02-30T09:00:00Z' }],
  ].map(items => ({ items })))('rejects duplicate, cross-invoice or malformed history rows (%j)', async ({ items }) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => json(String(input).includes('/payments?') ? page(items) : invoiceFixture));
    open(); await viewHistory();
    expect(await screen.findByRole('heading', { name: 'Unable to load payment history' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Invoice payment history' })).not.toBeInTheDocument();
  });

  it('keeps omitted reference/notes unknown and does not infer balance from displayed payments', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => json(String(input).includes('/payments?') ? page([{ ...payment, amount_minor: invoiceFixture.total_minor, external_ref: undefined, note: undefined }]) : invoiceFixture));
    open(); await viewHistory();
    const history = await screen.findByRole('table', { name: 'Invoice payment history' });
    expect(within(history).getAllByText('Not provided')).toHaveLength(2);
    expect(within(screen.getByRole('region', { name: 'Payment summary' })).getByText('₹862.00')).toBeInTheDocument();
  });

  it('refreshes the invoice and history from their endpoints, including server-confirmed full settlement', async () => {
    let settled = false;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => json(String(input).includes('/payments?') ? page() : settled ? { ...invoiceFixture, status: 'PAID', paid_minor: invoiceFixture.total_minor, balance_minor: 0 } : invoiceFixture));
    open(); await viewHistory(); await screen.findByRole('table', { name: 'Invoice payment history' });
    settled = true;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh invoice and history' }));
    await screen.findByRole('table', { name: 'Invoice payment history' });
    const summary = screen.getByRole('region', { name: 'Payment summary' });
    expect(within(summary).getByText('Paid')).toBeInTheDocument();
    expect(within(summary).getByText('₹0.00')).toBeInTheDocument();
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/invoices/invoice-1')).toHaveLength(2);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/payments?'))).toHaveLength(2);
  });

  it('ignores a late history response after navigating to another invoice', async () => {
    let finishOld!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
      const url = String(input);
      if (url.includes('/invoice-1/payments?')) return new Promise(resolve => { finishOld = resolve; });
      if (url.includes('/payments?')) return Promise.resolve(json(page([{ ...payment, id: 'payment-new', invoice_id: 'invoice-2' }])));
      return Promise.resolve(json(url.endsWith('invoice-2') ? { ...invoiceFixture, id: 'invoice-2', number: 'INV-000002' } : invoiceFixture));
    });
    const router = open(); await viewHistory();
    await act(async () => { await router.navigate('/app/invoices/invoice-2'); });
    await viewHistory(); await screen.findByText('payment-new');
    await act(async () => finishOld(json(page())));
    expect(screen.queryByText('payment-history-1')).not.toBeInTheDocument();
  });

  it('keeps customers outside internal history and never requests a global payment list', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER' } });
    const fetcher = vi.spyOn(globalThis, 'fetch'); open(true);
    await screen.findByRole('heading', { name: 'Your billing, in one place' });
    expect(screen.queryByRole('button', { name: 'View payment history' })).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
