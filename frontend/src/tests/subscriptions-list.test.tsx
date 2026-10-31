import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionsPage } from '../features/subscriptions/SubscriptionsPage';

const subscription = { id: 'sub-1', number: 'SUB-000001', account_id: 'account-1', plan_id: 'plan-1', status: 'ACTIVE', billing_interval: 'MONTHLY', recurring_amount_minor: 206000, next_billing_date: '2026-11-01' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const page = (items: unknown[] = [subscription], extra = {}) => ({ items, total: items.length, page: 1, page_size: 20, has_next: false, ...extra });
function open(path = '/app/subscriptions') {
  const router = createMemoryRouter([{ path: '/app/subscriptions', element: <SubscriptionsPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />); return router;
}
describe('subscription list', () => {
  it('loads and displays server minor-unit amounts and canonical status', async () => {
    let finish!: (value: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    open();
    expect(screen.getByRole('status', { name: 'Loading subscriptions' })).toBeInTheDocument();
    finish(json(page()));
    expect(await screen.findByRole('link', { name: 'SUB-000001' })).toHaveAttribute('href', '/app/subscriptions/sub-1');
    expect(screen.getByText('₹2,060.00')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1 Nov 2026')).toBeInTheDocument();
  });
  it('submits search and status to the backend, resetting pagination while retaining account scope', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(page()));
    const router = open('/app/subscriptions?page=3&customer_id=account-1');
    await screen.findByRole('link', { name: 'SUB-000001' });
    await userEvent.selectOptions(screen.getByLabelText('Subscription status'), 'PAUSED');
    await screen.findByRole('link', { name: 'SUB-000001' });
    await userEvent.type(screen.getByRole('searchbox'), 'SUB-');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('link', { name: 'SUB-000001' });
    const url = new URL(String(fetcher.mock.calls.at(-1)?.[0]), 'https://example.test');
    expect(url.searchParams.get('status')).toBe('PAUSED');
    expect(url.searchParams.get('customer_id')).toBe('account-1');
    expect(url.searchParams.get('search')).toBe('SUB-');
    expect(url.searchParams.get('page')).toBe('1');
    expect(router.state.location.search).not.toContain('page=3');
  });
  it('uses server has_next and page metadata for pagination', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const pageNumber = new URL(String(input), 'https://example.test').searchParams.get('page');
      return json(page([subscription], { total: 21, page: Number(pageNumber), has_next: pageNumber === '1' }));
    });
    open();
    await screen.findByRole('link', { name: 'SUB-000001' });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Page 2 · 21 records total');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(fetcher.mock.calls.at(-1)?.[0]).toContain('page=2');
  });
  it('does not invent missing amounts, intervals, or dates', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([{ ...subscription, recurring_amount_minor: undefined, billing_interval: undefined, next_billing_date: null }])));
    open(); await screen.findByRole('link', { name: 'SUB-000001' });
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
    expect(screen.getByText('Not scheduled')).toBeInTheDocument();
    expect(screen.getAllByText('Not provided')).toHaveLength(2);
  });
  it('distinguishes an empty dataset from a backend failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(page([])));
    open(); expect(await screen.findByRole('heading', { name: 'No subscriptions yet' })).toBeInTheDocument();
  });
  it.each([403, 404, 503])('renders HTTP %s as an error state', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, status));
    open(); expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No subscriptions yet')).not.toBeInTheDocument();
  });
  it('ignores a late response from an older filter', async () => {
    let oldResponse!: (value: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => new Promise(resolve => { oldResponse = resolve; })).mockImplementation(async () => json(page([])));
    open(); await userEvent.selectOptions(screen.getByLabelText('Subscription status'), 'CLOSED');
    await screen.findByRole('heading', { name: 'No subscriptions match these filters' });
    oldResponse(json(page()));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'SUB-000001' })).not.toBeInTheDocument());
  });
});
