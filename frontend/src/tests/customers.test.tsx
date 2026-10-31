import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CustomersPage } from '../features/customer/CustomersPage';
import { CustomerDetailPage } from '../features/customer/CustomerDetailPage';

const account = { id: 'account-1', display_name: 'Test customer', billing_email: 'billing@example.test', currency: 'INR', billing_address: 'Test address' };
const page = (items: unknown[] = [account], extra = {}) => ({ items, total: items.length, page: 1, page_size: 20, has_next: false, ...extra });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function open(path = '/app/customers') {
  const router = createMemoryRouter([{ path: '/app/customers', element: <CustomersPage /> }, { path: '/app/customers/:id', element: <CustomerDetailPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('customer records', () => {
  it('shows loading until a real response is available', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    open();
    expect(screen.getByRole('status', { name: 'Loading customers' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('renders a paginated list and server search without filtering only the loaded rows', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(page()));
    const router = open('/app/customers?page=2');
    await screen.findByRole('link', { name: 'Test customer' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search customers' }), 'Brightloop');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('link', { name: 'Test customer' });
    expect(router.state.location.search).toContain('search=Brightloop');
    expect(router.state.location.search).not.toContain('page=2');
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain('search=Brightloop');
  });
  it('labels current-page currency filtering and does not send an unsupported backend filter', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([account, { ...account, id: 'account-2', display_name: 'USD test customer', currency: 'USD' }])));
    open();
    await screen.findByRole('link', { name: 'USD test customer' });
    await userEvent.selectOptions(screen.getByLabelText('Billing currency (this page)'), 'INR');
    expect(screen.queryByRole('link', { name: 'USD test customer' })).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('shows an actual empty response and can clear an empty search', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(page([])));
    const router = open('/app/customers?search=nothing');
    expect(await screen.findByRole('heading', { name: 'No customers match these filters' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });
  it.each([403, 404, 503])('handles HTTP %s without inventing empty records', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, status));
    open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No customers yet')).not.toBeInTheDocument();
    if (status === 403) expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
  it('renders details and the correct linked subscription filter', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(account));
    open('/app/customers/account-1');
    expect(await screen.findByRole('heading', { name: 'Test customer' })).toBeInTheDocument();
    expect(screen.getByText('Test address')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View subscriptions' })).toHaveAttribute('href', '/app/subscriptions?customer_id=account-1');
    expect(screen.getByText('Invoices unavailable')).toBeInTheDocument();
  });
  it('rejects the incompatible auth account shape instead of guessing billing data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([{ id: 'account-1', email: 'auth@example.test' }])));
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot read yet');
  });
});
