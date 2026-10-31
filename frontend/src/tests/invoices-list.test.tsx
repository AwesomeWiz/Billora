import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { InvoiceListPage } from '../features/billing/InvoiceListPage';
import { invoiceFixture, invoiceJson as json, invoicePage as page } from './invoice-fixtures';

function open(path = '/app/invoices') {
  const router = createMemoryRouter([{ path: '/app/invoices', element: <InvoiceListPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />); return router;
}

describe('invoice list', () => {
  it('shows loading then invoice identity, dates, server amounts and a detail link', async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    open(); expect(screen.getByRole('status', { name: 'Loading invoices' })).toBeInTheDocument();
    await act(async () => finish(json(page())));
    expect(await screen.findByRole('link', { name: 'INV-000001' })).toHaveAttribute('href', '/app/invoices/invoice-1');
    expect(screen.getByRole('link', { name: 'Test customer' })).toHaveAttribute('href', '/app/customers/account-1');
    for (const amount of ['₹1,062.00', '₹200.00', '₹862.00']) expect(screen.getByText(amount)).toBeInTheDocument();
    expect(screen.getByText('31 Oct 2026')).toBeInTheDocument();
    expect(screen.getByText('14 Nov 2026')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByRole('cell', { name: 'Partially paid' })).toBeInTheDocument();
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: 'include', method: 'GET' });
  });

  it.each([['/app/invoices', 'No invoices yet'], ['/app/invoices?search=missing', 'No invoices match these filters']])('renders an actual empty response at %s', async (path, heading) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([]))); open(path);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each([403, 404, 503])('keeps HTTP %s distinct from an empty result', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, status)); open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument();
    if (status === 403) expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    if (status === 404) expect(screen.getByRole('alert')).toHaveTextContent('API has not been connected');
  });

  it('retries a failed GET without creating or mutating an invoice', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({}, 503)).mockImplementation(async () => json(page()));
    open(); await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByRole('link', { name: 'INV-000001' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('submits search and exact due date to the server and resets page while retaining status/page size', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(page()));
    const router = open('/app/invoices?page=3&page_size=25&status=CONFIRMED');
    await screen.findByRole('link', { name: 'INV-000001' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search invoices' }), 'INV-000');
    fireEvent.change(screen.getByLabelText('Due on'), { target: { value: '2026-11-14' } });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('link', { name: 'INV-000001' });
    const query = new URL(String(fetcher.mock.calls.at(-1)?.[0]), 'https://example.test').searchParams;
    expect(Object.fromEntries(query)).toMatchObject({ page: '1', page_size: '25', status: 'CONFIRMED', due_on: '2026-11-14', search: 'INV-000' });
    expect(query.has('date_from')).toBe(false);
    expect(router.state.location.search).not.toContain('page=3');
    await userEvent.selectOptions(screen.getByLabelText('Invoice status'), 'PAID');
    await screen.findByRole('link', { name: 'INV-000001' });
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain('status=PAID');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });

  it('uses server page metadata and has_next, and resets page for a new page size', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const query = new URL(String(input), 'https://example.test').searchParams;
      return json(page([invoiceFixture], { total: 21, page: Number(query.get('page')), page_size: Number(query.get('page_size')), has_next: query.get('page') === '1' }));
    });
    open(); await screen.findByRole('link', { name: 'INV-000001' });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Page 2 · 21 records total');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50');
    await screen.findByText('Page 1 · 21 records total');
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain('page_size=50');
  });

  it('shows missing optional amounts and customer name without inventing zero balances', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([{ ...invoiceFixture, paid_minor: undefined, balance_minor: undefined, billing_account: undefined }])));
    open(); await screen.findByRole('link', { name: 'INV-000001' });
    expect(screen.getByRole('link', { name: 'account-1' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Not provided' })).toHaveLength(3);
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
  });

  it.each([
    [{ ...invoiceFixture, paid_minor: 0, balance_minor: 106200, due_on: '2000-01-01' }, 'Unpaid'],
    [{ ...invoiceFixture, paid_minor: 0, balance_minor: 106200, due_on: '2099-01-01', payment_status: 'OVERDUE' }, 'Overdue'],
    [{ ...invoiceFixture, status: 'PAID', paid_minor: 106200, balance_minor: 0 }, 'Paid'],
    [{ ...invoiceFixture, paid_minor: 106200, balance_minor: 0 }, 'Awaiting settlement'],
  ])('uses supplied server state rather than a local date or inferred lifecycle promotion (%s)', async (invoice, label) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([invoice]))); open();
    await screen.findByRole('link', { name: 'INV-000001' });
    expect(within(screen.getByRole('table')).getAllByRole('cell', { name: label }).length).toBeGreaterThan(0);
    if (!invoice.payment_status) expect(screen.queryByRole('cell', { name: 'Overdue' })).not.toBeInTheDocument();
    if (invoice.status !== 'PAID') expect(screen.queryByRole('cell', { name: 'Paid' })).not.toBeInTheDocument();
  });

  it.each(['/app/invoices?status=OVERDUE', '/app/invoices?due_on=2026-02-30'])('rejects invalid filters without sending an unfiltered request: %s', async path => {
    const fetcher = vi.spyOn(globalThis, 'fetch'); open(path);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([{ total_minor: 1.5 }, { total_minor: -1 }, { paid_minor: 200000 }, { balance_minor: 10 }, { status: 'PARTIALLY_PAID' }])('rejects malformed financial records %j', async invalid => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([{ ...invoiceFixture, ...invalid }]))); open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('ignores a late response for a previous filter', async () => {
    let oldResponse!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; })).mockImplementation(async () => json(page([])));
    open(); await userEvent.selectOptions(screen.getByLabelText('Invoice status'), 'CANCELLED');
    await screen.findByRole('heading', { name: 'No invoices match these filters' });
    await act(async () => oldResponse(json(page())));
    expect(screen.queryByRole('link', { name: 'INV-000001' })).not.toBeInTheDocument();
  });
});
