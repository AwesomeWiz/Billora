import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ReportsPage } from '../features/dashboard/ReportsPage';
import { overdueInvoice, overduePage, reportJson as json, reportSummary as summary } from './report-fixtures';

function open(path = '/app/reports') {
  const router = createMemoryRouter([{ path: '/app/reports', element: <ReportsPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />); return router;
}
function summaryOrHistory(url: unknown, body: unknown, status = 200) { return String(url) === '/api/reports/summary' ? json(summary) : json(body, status); }

describe('overdue financial reports', () => {
  it('shows invoice/customer links and explicit server balances without using page rows as aggregate metrics', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => summaryOrHistory(url, overduePage())); open();
    const table = await screen.findByRole('table', { name: 'Overdue invoices' });
    expect(within(table).getByRole('link', { name: 'INV-000001' })).toHaveAttribute('href', '/app/invoices/invoice-1');
    expect(within(table).getByRole('link', { name: 'Test customer' })).toHaveAttribute('href', '/app/customers/account-1');
    for (const amount of ['₹1,062.00', '₹200.00', '₹862.00']) expect(within(table).getByText(amount)).toBeInTheDocument();
    expect(within(table).getByText('15 Oct 2026')).toHaveAttribute('datetime', '2026-10-15');
    expect(within(table).getByText('Overdue')).toBeInTheDocument();
    expect(within(table).getByText('Partially paid')).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: 'Financial summary' });
    expect(within(metrics).getByText('₹250.00')).toBeInTheDocument();
    expect(within(metrics).getByText('₹987.65')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledWith('/api/reports/overdue?page=1&page_size=20', expect.objectContaining({ method: 'GET', credentials: 'include' }));
  });

  it('shows overdue loading independently from a completed summary', async () => {
    let finish!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(url => String(url) === '/api/reports/summary' ? Promise.resolve(json(summary)) : new Promise(resolve => { finish = resolve; })); open();
    expect(screen.getByRole('status', { name: 'Loading overdue invoices' })).toBeInTheDocument();
    expect(await screen.findByText('₹1,234.56')).toBeInTheDocument();
    await act(async () => finish(json(overduePage())));
    expect(screen.getByRole('table', { name: 'Overdue invoices' })).toBeInTheDocument();
  });

  it('keeps an empty overdue page distinct from missing summary data or an aggregate zero', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => summaryOrHistory(url, overduePage([]))); open();
    expect(await screen.findByRole('heading', { name: 'No overdue invoices in this response' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Financial summary' })).getByText('₹250.00')).toBeInTheDocument();
  });

  it.each([403, 404, 503])('handles HTTP %s from overdue independently from summary', async status => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => summaryOrHistory(url, {}, status)); open();
    const overdue = screen.getByRole('region', { name: 'Overdue invoice report' });
    const alert = await within(overdue).findByRole('alert');
    if (status === 403) {
      expect(alert).toHaveTextContent('Overdue report access denied');
      expect(within(overdue).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    }
    if (status === 404) expect(alert).toHaveTextContent('Overdue report unavailable');
    expect(within(screen.getByRole('region', { name: 'Financial summary' })).getByText('₹1,234.56')).toBeInTheDocument();
    expect(within(overdue).queryByRole('heading', { name: 'No overdue invoices in this response' })).not.toBeInTheDocument();
  });

  it('does not hide the overdue endpoint when the summary API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => String(url) === '/api/reports/summary' ? json({}, 404) : json(overduePage())); open();
    expect(await screen.findByRole('heading', { name: 'Financial summary unavailable' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Overdue invoices' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Not available')).toHaveLength(6);
  });

  it('uses server pagination, resets page with size changes, and does not refetch or recalculate the summary', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input) === '/api/reports/summary') return json(summary);
      const url = new URL(String(input), 'http://localhost');
      const page = Number(url.searchParams.get('page')); const page_size = Number(url.searchParams.get('page_size'));
      return json(overduePage([{ ...overdueInvoice, id: 'invoice-' + page, number: 'INV-PAGE-' + page }], { page, page_size, total: 21, has_next: page === 1 }));
    });
    const router = open(); await screen.findByRole('link', { name: 'INV-PAGE-1' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('link', { name: 'INV-PAGE-2' })).toBeInTheDocument();
    expect(router.state.location.search).toContain('page=2');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    expect(await screen.findByRole('link', { name: 'INV-PAGE-1' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page_size=50');
    expect(fetcher).toHaveBeenLastCalledWith('/api/reports/overdue?page=1&page_size=50', expect.anything());
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/reports/summary')).toHaveLength(1);
    expect(screen.getByText('₹250.00')).toBeInTheDocument();
  });

  it('keeps unsupported date controls disabled without sending guessed date parameters', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => summaryOrHistory(url, overduePage())); open();
    await screen.findByRole('table', { name: 'Overdue invoices' });
    const from = screen.getByLabelText('From date'); const to = screen.getByLabelText('Through date');
    expect(from).toBeDisabled(); expect(to).toBeDisabled();
    fireEvent.change(from, { target: { value: '2026-10-01' } });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([url]) => !String(url).includes('from') && !String(url).includes('to='))).toBe(true);
  });

  it.each(['?from_date=2026-10-01', '?customer_id=test-account', '?status=OVERDUE', '?page=0', '?page=2&page=3', '?page_size=1000'])('rejects unsupported/ambiguous filters %s instead of silently showing a broader report', async query => {
    const fetcher = vi.spyOn(globalThis, 'fetch'); open('/app/reports' + query);
    expect(screen.getByRole('heading', { name: 'Report filters unavailable' })).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockImplementation(async url => summaryOrHistory(url, overduePage()));
    await userEvent.click(screen.getByRole('link', { name: 'Reset report filters' }));
    expect(await screen.findByRole('table', { name: 'Overdue invoices' })).toBeInTheDocument();
  });

  it.each([
    overduePage([{ ...overdueInvoice, status: 'PAID', paid_minor: overdueInvoice.total_minor, balance_minor: 0 }]),
    overduePage([{ ...overdueInvoice, status: 'CANCELLED', paid_minor: 0 }]),
    overduePage([{ ...overdueInvoice, balance_minor: undefined }]),
    overduePage([{ ...overdueInvoice, balance_minor: 0.5 }]),
    overduePage([{ ...overdueInvoice, paid_minor: -1 }]),
    overduePage([overdueInvoice, overdueInvoice]), overduePage([overdueInvoice], { page: 2 }),
    [], { items: [] },
  ])('rejects incompatible, noncollectible or financially invalid report rows/envelopes (%j)', async invalid => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => summaryOrHistory(url, invalid)); open();
    expect(await within(screen.getByRole('region', { name: 'Overdue invoice report' })).findByRole('alert')).toHaveTextContent('unsupported overdue report');
    expect(screen.queryByRole('table', { name: 'Overdue invoices' })).not.toBeInTheDocument();
  });

  it('preserves unknown customer/paid projections and labels overdue from the endpoint rather than the device date', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url => summaryOrHistory(url, overduePage([{ ...overdueInvoice, currency: 'USD', billing_account: undefined, paid_minor: undefined, due_on: '2099-01-01' }]))); open();
    const table = await screen.findByRole('table', { name: 'Overdue invoices' });
    expect(within(table).getByRole('link', { name: 'account-1' })).toHaveAttribute('href', '/app/customers/account-1');
    expect(within(table).getByText('Not provided')).toBeInTheDocument();
    expect(within(table).getByText('Overdue')).toBeInTheDocument();
    expect(within(table).queryByText('₹862.00')).not.toBeInTheDocument();
  });

  it('retries a network failure only after an explicit read retry', async () => {
    let count = 0;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
      if (String(url) === '/api/reports/summary') return json(summary);
      if (++count === 1) throw new TypeError('Network interrupted');
      return json(overduePage());
    });
    open(); await screen.findByRole('heading', { name: 'Unable to load overdue report' });
    expect(count).toBe(1);
    await userEvent.click(within(screen.getByRole('region', { name: 'Overdue invoice report' })).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Overdue invoices' })).toBeInTheDocument();
    expect(count).toBe(2); expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('ignores a late page response after browser navigation changes the report page', async () => {
    let finishOld!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(input => {
      const url = String(input);
      if (url === '/api/reports/summary') return Promise.resolve(json(summary));
      if (url.includes('page=2&')) return new Promise(resolve => { finishOld = resolve; });
      return Promise.resolve(json(overduePage([overdueInvoice], { total: 21, has_next: true })));
    });
    const router = open(); await screen.findByRole('table', { name: 'Overdue invoices' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await act(async () => { await router.navigate('/app/reports'); });
    await screen.findByRole('link', { name: 'INV-000001' });
    await act(async () => finishOld(json(overduePage([{ ...overdueInvoice, id: 'old-page', number: 'INV-LATE' }], { page: 2 }))));
    expect(screen.queryByRole('link', { name: 'INV-LATE' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'INV-000001' })).toBeInTheDocument();
  });
});
