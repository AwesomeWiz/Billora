import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';

const session = { user: { id: 'customer-a', email: 'customer-a@example.test', account_id: 'account-a', role: 'CUSTOMER' as const }, csrf_token: 'test-csrf' };
function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected internal data request'));
});

describe('customer invoice and account portal boundaries', () => {
  it('renders an unavailable invoice list without claiming an empty or zero balance', async () => {
    open('/portal/invoices');
    await screen.findByRole('heading', { name: 'My invoices' });
    expect(screen.getByRole('heading', { name: 'Your invoices are not connected yet' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(['owned-id', 'another-account-id'])('refuses unverified snapshot/history reads for %s and cannot print', async id => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    open('/portal/invoices/' + id);
    await screen.findByRole('heading', { name: 'Your invoice' });
    const button = screen.getByRole('button', { name: 'Print invoice' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription(/authorized, immutable invoice snapshot/);
    await userEvent.click(button);
    expect(print).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled(); // No current-price or unscoped invoice reads.
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payment history is not connected yet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm|cancel|send|record payment/i })).not.toBeInTheDocument();
  });

  it('displays only the verified session account and no profile/password mutation', async () => {
    open('/portal/account');
    await screen.findByRole('heading', { name: 'Your account' });
    expect(within(screen.getByRole('main')).getByText(session.user.email)).toBeInTheDocument();
    expect(screen.getByText('account-a')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account changes are not connected yet' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('uses a new session account after remount without retaining previous billing data', async () => {
    const first = render(<AuthProvider><RouterProvider router={createMemoryRouter(routeConfig, { initialEntries: ['/portal/account'] })} /></AuthProvider>);
    await screen.findByText('account-a'); first.unmount();
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, id: 'customer-b', email: 'customer-b@example.test', account_id: 'account-b' } });
    open('/portal/account');
    expect(await screen.findByText('account-b')).toBeInTheDocument();
    expect(screen.queryByText('account-a')).not.toBeInTheDocument();
    expect(screen.queryByText('customer-a@example.test')).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('supports invoice/account navigation in desktop and mobile shells without duplicates', async () => {
    const router = open('/portal/home');
    const desktop = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(desktop).getAllByRole('link', { name: 'My invoices' })).toHaveLength(1);
    await userEvent.click(within(desktop).getByRole('link', { name: 'My invoices' }));
    await screen.findByRole('heading', { name: 'My invoices' });
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const mobile = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(mobile).getAllByRole('link', { name: 'My invoices' })).toHaveLength(1);
    await userEvent.click(within(mobile).getByRole('link', { name: 'Account' }));
    await screen.findByRole('heading', { name: 'Your account' });
    expect(router.state.location.pathname).toBe('/portal/account');
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
    expect(within(desktop).queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
  });

  it.each(['/portal/home', '/portal/subscriptions', '/portal/subscriptions/private-id', '/portal/invoices', '/portal/invoices/private-id', '/portal/account'])('redirects ADMIN and STAFF away from %s', async path => {
    for (const role of ['ADMIN', 'STAFF'] as const) {
      vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
      const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
      const mounted = render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
      await waitFor(() => expect(router.state.location.pathname).toBe('/app/overview'));
      expect(screen.queryByRole('heading', { name: /My invoices|Your invoice|Your account|My subscriptions|Your subscription/ })).not.toBeInTheDocument();
      mounted.unmount();
    }
  });

  it.each(['/app/invoices', '/app/invoices/private-id', '/app/reports', '/app/subscriptions'])('denies CUSTOMER internal route %s without internal fetches', async path => {
    const router = open(path);
    await screen.findByRole('heading', { name: 'Your billing, in one place' });
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('redirects anonymous invoice deep links to login', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Sign in required'));
    const router = open('/portal/invoices/private-id');
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(router.state.location.state.from).toBe('/portal/invoices/private-id');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
