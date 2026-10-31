import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionDetailPage } from '../features/subscriptions/SubscriptionDetailPage';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { api } from '../lib/api';

const subscription = { id: 'sub-1', number: 'SUB-000001', account_id: 'account-1', plan_id: 'plan-1', status: 'CONFIRMED', start_date: '2026-10-01', expiry_date: '2027-10-01', next_billing_date: '2026-11-01', payment_term_days: 14,
  lines: [{ id: 'line-1', product_id: 'product-1', variant_id: 'variant-1', description: 'Agreed support seats', quantity: 3, unit_price_minor: 206000, billable: true }] };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function fetchRecords(detail: unknown = subscription, missingRelationships = false) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    if (String(input).startsWith('/api/accounts/')) return missingRelationships ? json({}, 404) : json({ id: 'account-1', display_name: 'Test customer', billing_email: 'billing@example.test' });
    if (String(input).startsWith('/api/plans/')) return missingRelationships ? json({}, 404) : json({ id: 'plan-1', name: 'Test monthly', billing_interval: 'MONTHLY', active: true, can_pause: true, can_renew: false, can_close_early: false });
    return json(detail);
  });
}
beforeEach(() => vi.spyOn(authService, 'session').mockImplementation(async () => {
  api.setCsrfToken('test-csrf');
  return { user: { id: 'staff-1', email: 'staff@example.test', role: 'STAFF' }, csrf_token: 'test-csrf' };
}));
function open() { render(<AuthProvider><RouterProvider router={createMemoryRouter([{ path: '/app/subscriptions/:id', element: <SubscriptionDetailPage /> }], { initialEntries: ['/app/subscriptions/sub-1'] })} /></AuthProvider>); }
describe('subscription details', () => {
  it('renders dates, agreed variant/unit prices, payment terms, customer and plan without inventing a total', async () => {
    fetchRecords(); open();
    expect(await screen.findByRole('heading', { name: 'SUB-000001' })).toBeInTheDocument();
    expect(await screen.findByText('Test monthly')).toBeInTheDocument();
    expect(await screen.findByText('Test customer')).toBeInTheDocument();
    expect(screen.getByText('Agreed support seats')).toBeInTheDocument();
    expect(screen.getByText('variant-1')).toBeInTheDocument();
    expect(screen.getByText('₹2,060.00')).toBeInTheDocument();
    expect(screen.queryByText('₹6,180.00')).not.toBeInTheDocument();
    expect(screen.getByText('14 days')).toBeInTheDocument();
    expect(screen.getByText('1 Oct 2027')).toBeInTheDocument();
  });
  it('keeps the agreement readable when customer/plan endpoints are not yet available', async () => {
    fetchRecords(subscription, true); open();
    await screen.findByRole('heading', { name: 'SUB-000001' });
    expect(await screen.findAllByRole('alert')).toHaveLength(2);
    expect(screen.getByText('Agreed support seats')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Related invoices unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lifecycle history unavailable' })).toBeInTheDocument();
  });
  it('distinguishes absent lines from an empty line array', async () => {
    fetchRecords({ ...subscription, lines: undefined }); open();
    expect(await screen.findByRole('heading', { name: 'Product lines unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('No product lines')).not.toBeInTheDocument();
  });
  it('rejects invalid lifecycle states', async () => {
    fetchRecords({ ...subscription, status: 'PARTIALLY_PAID' }); open();
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot read yet');
  });
  it('rejects fractional agreed prices instead of rounding financial input', async () => {
    fetchRecords({ ...subscription, lines: [{ ...subscription.lines[0], unit_price_minor: 1.5 }] }); open();
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot read yet');
  });
  it('rejects a mismatched record identity', async () => {
    fetchRecords({ ...subscription, id: 'other-subscription' }); open();
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot read yet');
    expect(screen.queryByText('Agreed support seats')).not.toBeInTheDocument();
  });
  it('refetches the agreement after a validated activation response', async () => {
    let activated = false;
    let reads = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
      if (String(input).startsWith('/api/accounts/')) return json({ id: 'account-1', display_name: 'Test customer', billing_email: 'billing@example.test' });
      if (String(input).startsWith('/api/plans/')) return json({ id: 'plan-1', name: 'Test monthly', billing_interval: 'MONTHLY', active: true });
      if (options?.method === 'POST') activated = true; else reads++;
      return json({ ...subscription, status: activated ? 'ACTIVE' : 'CONFIRMED' });
    });
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Activate' }));
    await userEvent.type(screen.getByLabelText(/Reason/), 'Approved agreement');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm activate' }));
    expect(await screen.findByText('The server confirmed SUB-000001 as active.')).toBeInTheDocument();
    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(reads).toBe(2);
  });
});
