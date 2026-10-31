import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';
import { reportJson, reportSummary } from './report-fixtures';

const path = '/app/catalog/plans';
const session = { user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-csrf' };
function open(initialPath = path) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [initialPath] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input) === '/api/reports/summary' ? reportJson(reportSummary) : new Response(
    JSON.stringify({ items: [], total: 0, page: 1, page_size: 20, has_next: false }),
    { headers: { 'Content-Type': 'application/json' } },
  ));
});

describe('subscription plans route integration', () => {
  it.each(['ADMIN', 'STAFF'] as const)('mounts the exported PlansPage in AppShell for %s', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Subscription Plans' }, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No subscription plans configured' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getAllByRole('link', { name: 'Plans' })).toHaveLength(1);
    expect(within(navigation).getByRole('link', { name: 'Plans' })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).getByRole('link', { name: 'Products & Variants' })).toHaveAttribute('href', '/app/catalog/products');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/plans', expect.objectContaining({ method: 'GET', credentials: 'include' }));
    if (role === 'ADMIN') for (const label of ['Taxes & discounts', 'Staff']) {
      expect(within(navigation).getByText(label).closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
      expect(within(navigation).queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('navigates between Products and Plans using the desktop sidebar', async () => {
    const router = open('/app/catalog/products');
    await screen.findByRole('heading', { name: 'Products & Variants' });
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    await userEvent.click(within(navigation).getByRole('link', { name: 'Plans' }));
    expect(await screen.findByRole('heading', { name: 'Subscription Plans' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    await userEvent.click(within(navigation).getByRole('link', { name: 'Products & Variants' }));
    expect(await screen.findByRole('heading', { name: 'Products & Variants' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/catalog/products');
  });

  it.each(['ADMIN', 'STAFF'] as const)('keeps one Plans link and working Products navigation in the mobile drawer for %s', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const router = open('/app/overview');
    await userEvent.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const navigation = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(navigation).getAllByRole('link', { name: 'Plans' })).toHaveLength(1);
    await userEvent.click(within(navigation).getByRole('link', { name: 'Plans' }));
    expect(await screen.findByRole('heading', { name: 'Subscription Plans' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    await userEvent.click(within(navigation).getByRole('link', { name: 'Products & Variants' }));
    expect(await screen.findByRole('heading', { name: 'Products & Variants' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/catalog/products');
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
  });

  it('redirects CUSTOMER before mounting or requesting the internal plans module', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER', account_id: 'test-account' } });
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(screen.queryByRole('link', { name: 'Plans' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('preserves the plans deep link when an anonymous user must sign in', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from).toBe(path);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('waits for the verified session before requesting plan data', () => {
    vi.mocked(authService.session).mockImplementation(() => new Promise(() => {})); open();
    expect(screen.getByRole('status', { name: 'Verifying your session' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Subscription Plans' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([403, 404])('retains the module’s honest HTTP %s state inside AppShell', async status => {
    vi.mocked(globalThis.fetch).mockImplementation(async () => new Response('{}', { status, headers: { 'Content-Type': 'application/json' } }));
    open();
    expect(await screen.findByRole('heading', { name: 'Subscription Plans' })).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(status === 404 ? 'Subscription plans endpoint not mounted' : 'Failed to load subscription plans');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    if (status === 404) expect(screen.getByRole('button', { name: '+ New plan' })).toBeDisabled();
  });
});
