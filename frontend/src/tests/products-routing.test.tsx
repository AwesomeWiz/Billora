import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';
import { reportJson, reportSummary } from './report-fixtures';

const path = '/app/catalog/products';
const session = {
  user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const },
  csrf_token: 'test-only-csrf',
};

function open(initialPath = path) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [initialPath] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}

beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input) === '/api/reports/summary' ? reportJson(reportSummary) : new Response(
    JSON.stringify({ items: [], total: 0, page: 1, page_size: 20, has_next: false }),
    { headers: { 'Content-Type': 'application/json' } },
  ));
});

describe('products module integration', () => {
  it.each(['ADMIN', 'STAFF'] as const)('mounts the exported page in AppShell for %s', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Products & Variants' }, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No products in catalog' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getByRole('link', { name: 'Products & Variants' })).toHaveAttribute('aria-current', 'page');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'GET', credentials: 'include' }));
    if (role === 'ADMIN') {
      expect(within(navigation).getByRole('link', { name: 'Plans' })).toHaveAttribute('href', '/app/catalog/plans');
      for (const label of ['Staff']) {
        expect(within(navigation).getByText(label).closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
        expect(within(navigation).queryByRole('link', { name: label })).not.toBeInTheDocument();
      }
    }
  });

  it('opens the page through the desktop sidebar', async () => {
    const router = open('/app/overview');
    const navigation = await screen.findByRole('navigation', { name: 'Main navigation' });
    const link = within(navigation).getByRole('link', { name: 'Products & Variants' });
    expect(link).toHaveAttribute('href', path);
    await userEvent.click(link);
    expect(await screen.findByRole('heading', { name: 'Products & Variants' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
  });

  it('uses the same working link in the mobile drawer and closes it after navigation', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'STAFF' } });
    const router = open('/app/overview');
    await userEvent.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const navigation = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    await userEvent.click(within(navigation).getByRole('link', { name: 'Products & Variants' }));
    expect(await screen.findByRole('heading', { name: 'Products & Variants' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
  });

  it('redirects CUSTOMER without mounting or requesting the internal catalog', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER', account_id: 'test-account' } });
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(screen.queryByRole('link', { name: 'Products & Variants' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('preserves the products deep link when redirecting anonymous users to login', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
    const router = open();
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from).toBe(path);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('waits for session verification before requesting catalog data', async () => {
    vi.mocked(authService.session).mockImplementation(() => new Promise(() => {}));
    open();
    expect(screen.getByRole('status', { name: 'Verifying your session' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Products & Variants' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('keeps backend permission failures visible inside the mounted page', async () => {
    vi.mocked(globalThis.fetch).mockImplementation(async () => new Response(
      JSON.stringify({ code: 'FORBIDDEN', message: 'Catalog access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    ));
    open();
    expect(await screen.findByRole('heading', { name: 'Failed to load catalog products' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Catalog access denied');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
