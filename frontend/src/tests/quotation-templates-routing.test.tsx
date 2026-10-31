import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';
import { reportJson, reportSummary } from './report-fixtures';

const path = '/app/quotation-templates';
const session = { user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-csrf' };
function open(initialPath = path) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [initialPath] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  // Test-only empty responses exercise the real module without inventing templates.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input) === '/api/reports/summary'
    ? reportJson(reportSummary)
    : reportJson({ items: [], total: 0, page: 1, page_size: 20, has_next: false }));
});

describe('quotation templates route integration', () => {
  it.each(['ADMIN', 'STAFF'] as const)('mounts the exported page inside AppShell for %s', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Quotation Templates' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No quotation templates configured' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = within(navigation).getAllByRole('link', { name: 'Quotation Templates' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[0]).toHaveAttribute('href', path);
    for (const name of ['Payments', 'Taxes & discounts', 'Staff']) {
      expect(within(navigation).queryByRole('link', { name })).not.toBeInTheDocument();
    }
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/quotation-templates', expect.objectContaining({ method: 'GET', credentials: 'include' }));
  });

  it('navigates from the desktop sidebar and preserves existing destinations', async () => {
    const router = open('/app/catalog/products');
    await screen.findByRole('heading', { name: 'Products & Variants' });
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    await userEvent.click(within(navigation).getByRole('link', { name: 'Quotation Templates' }));
    await screen.findByRole('heading', { name: 'Quotation Templates' });
    expect(router.state.location.pathname).toBe(path);
    for (const [label, destination, heading] of [
      ['Plans', '/app/catalog/plans', 'Subscription Plans'],
      ['Reports', '/app/reports', 'Reports'],
      ['Invoices', '/app/invoices', 'Invoices'],
      ['Products & Variants', '/app/catalog/products', 'Products & Variants'],
    ]) {
      await userEvent.click(within(navigation).getByRole('link', { name: label }));
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(destination);
    }
  });

  it.each(['ADMIN', 'STAFF'] as const)('offers one mobile link and closes the drawer after navigation for %s', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const router = open('/app/catalog/plans');
    await userEvent.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const navigation = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(navigation).getAllByRole('link', { name: 'Quotation Templates' })).toHaveLength(1);
    for (const [name, href] of [['Products & Variants', '/app/catalog/products'], ['Plans', '/app/catalog/plans'], ['Reports', '/app/reports'], ['Invoices', '/app/invoices']]) {
      expect(within(navigation).getByRole('link', { name })).toHaveAttribute('href', href);
    }
    await userEvent.click(within(navigation).getByRole('link', { name: 'Quotation Templates' }));
    expect(await screen.findByRole('heading', { name: 'Quotation Templates' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
  });

  it('redirects CUSTOMER without mounting the module or requesting internal data', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER', account_id: 'test-account' } });
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(screen.queryByRole('link', { name: 'Quotation Templates' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('preserves the deep link while redirecting an anonymous user to login', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
    const router = open();
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from).toBe(path);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('waits for session verification before mounting quotation templates', () => {
    vi.mocked(authService.session).mockImplementation(() => new Promise(() => {})); open();
    expect(screen.getByRole('status', { name: 'Verifying your session' })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('keeps the module API-unavailable notice visible inside AppShell', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () => reportJson({}, 404));
    open();
    expect(await screen.findByTestId('templates-unavailable-notice')).toHaveTextContent('Quotation Templates API Pending');
    expect(screen.getByRole('heading', { name: 'Quotation Templates' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
