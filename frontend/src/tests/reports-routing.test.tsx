import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';
import { overduePage, reportJson as json, reportSummary } from './report-fixtures';

const session = { user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-csrf' };
function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input);
    if (url === '/api/reports/summary') return json(reportSummary);
    if (url.startsWith('/api/reports/overdue?')) return json(overduePage());
    return json({ items: [], total: 0, page: 1, page_size: 20, has_next: false });
  });
});

describe('financial reporting access and navigation', () => {
  it.each(['ADMIN', 'STAFF'] as const)('permits %s overview metrics within AppShell', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } }); open('/app/overview');
    expect(await screen.findByText('₹1,234.56', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View financial reports' })).toHaveAttribute('href', '/app/reports');
    expect(screen.getByRole('link', { name: /Review overdue invoice report/ })).toHaveAttribute('href', '/app/reports#overdue-invoices');
  });

  it.each(['ADMIN', 'STAFF'] as const)('permits %s reports while preserving catalog links and disabled unfinished modules', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } }); open('/app/reports');
    expect(await screen.findByRole('table', { name: 'Overdue invoices' }, { timeout: 3000 })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getAllByRole('link', { name: 'Reports' })).toHaveLength(1);
    expect(within(navigation).getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', { name: 'Products & Variants' })).toHaveAttribute('href', '/app/catalog/products');
    expect(within(navigation).getByRole('link', { name: 'Plans' })).toHaveAttribute('href', '/app/catalog/plans');
    for (const name of ['Payments', 'Taxes & discounts', 'Staff']) expect(within(navigation).queryByRole('link', { name })).not.toBeInTheDocument();
  });

  it.each(['/app/overview', '/app/reports'])('denies CUSTOMER aggregate data at %s before requesting reports', async path => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER', account_id: 'test-account' } });
    const router = open(path);
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
  });

  it('redirects an anonymous report deep link to login without fetching finance data', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
    const router = open('/app/reports?page=2');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.state.from).toBe('/app/reports?page=2');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('waits for session verification before mounting financial reads', () => {
    vi.mocked(authService.session).mockImplementation(() => new Promise(() => {})); open('/app/reports');
    expect(screen.getByRole('status', { name: 'Verifying your session' })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'STAFF'] as const)('supports %s desktop and mobile report navigation and preserves Plans', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const router = open('/app/overview');
    const navigation = await screen.findByRole('navigation', { name: 'Main navigation' });
    await userEvent.click(within(navigation).getByRole('link', { name: 'Reports' }));
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const mobile = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    await userEvent.click(within(mobile).getByRole('link', { name: 'Plans' }));
    expect(await screen.findByRole('heading', { name: 'Subscription Plans' })).toBeInTheDocument();
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(within(mobile).getAllByRole('link', { name: 'Reports' })).toHaveLength(1);
    await userEvent.click(within(mobile).getByRole('link', { name: 'Reports' }));
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/reports');
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
  });

  it('removes financial reports when the API reports session expiry', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () => json({}, 401));
    const router = open('/app/reports');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('region', { name: 'Financial summary' })).not.toBeInTheDocument();
  });
});
