import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';
import { invoiceFixture, invoiceJson, invoicePage } from './invoice-fixtures';

function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
beforeEach(() => { vi.spyOn(authService, 'session').mockResolvedValue({ user: { id: 'test-user', email: 'staff@example.test', role: 'STAFF' }, csrf_token: 'test-only-csrf' }); });
describe('internal invoice route permissions', () => {
  it.each(['ADMIN', 'STAFF'] as const)('permits %s to read the invoice list', async role => {
    vi.mocked(authService.session).mockResolvedValue({ user: { id: 'test-user', email: 'staff@example.test', role }, csrf_token: 'test-only-csrf' });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => invoiceJson(invoicePage()));
    open('/app/invoices');
    expect(await screen.findByRole('link', { name: 'INV-000001' }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Confirm|Cancel|Send|Record payment)/i })).not.toBeInTheDocument();
  });
  it.each(['/app/invoices', '/app/invoices/invoice-1'])('redirects CUSTOMER before any internal invoice request at %s', async path => {
    vi.mocked(authService.session).mockResolvedValue({ user: { id: 'test-customer', email: 'customer@example.test', role: 'CUSTOMER', account_id: 'account-1' }, csrf_token: 'test-only-csrf' });
    const fetcher = vi.spyOn(globalThis, 'fetch'); const router = open(path);
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['ADMIN', 'STAFF'] as const)('permits %s to read invoice details', async role => {
    vi.mocked(authService.session).mockResolvedValue({ user: { id: 'test-user', email: 'staff@example.test', role }, csrf_token: 'test-only-csrf' });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => invoiceJson(invoiceFixture));
    open('/app/invoices/invoice-1');
    expect(await screen.findByRole('heading', { name: 'INV-000001' }, { timeout: 3000 })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe('/api/invoices/invoice-1');
  });
  it('sends anonymous deep links to login without fetching invoice data', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const router = open('/app/invoices/invoice-1');
    expect(await screen.findByRole('heading', { name: 'Welcome back' }, { timeout: 3000 })).toBeInTheDocument();
    expect(router.state.location.state.from).toBe('/app/invoices/invoice-1');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
