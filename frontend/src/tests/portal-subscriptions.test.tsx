import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { ApiError } from '../lib/api';

const session = { user: { id: 'test-customer', account_id: 'account-a', email: 'customer@example.test', role: 'CUSTOMER' as const }, csrf_token: 'test-csrf' };
function open(path = '/portal/subscriptions') {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected unscoped data request'));
});

describe('customer subscription portal with unavailable ownership contracts', () => {
  it('renders a CUSTOMER page within AppShell without internal API reads', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'My subscriptions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your subscriptions are not connected yet' })).toBeInTheDocument();
    expect(screen.queryByText('No subscriptions yet')).not.toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getAllByRole('link', { name: 'My subscriptions' })).toHaveLength(1);
    expect(within(nav).getByRole('link', { name: 'My subscriptions' })).toHaveAttribute('aria-current', 'page');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(['/portal/subscriptions/owned-id', '/portal/subscriptions/another-account-id'])('does not retrieve or expose unverified detail at %s', async path => {
    open(path);
    await screen.findByRole('heading', { name: 'Your subscription' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    for (const action of ['Pause', 'Close', 'Renew']) expect(screen.getByRole('button', { name: `${action} subscription` })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Back to my subscriptions' })).toHaveAttribute('href', '/portal/subscriptions');
  });

  it('shows unavailable home metrics without inventing customer aggregates', async () => {
    open('/portal/home');
    await screen.findByRole('heading', { name: 'Your billing, in one place' });
    expect(screen.getAllByLabelText('Not available')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Active subscriptions' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View my subscriptions' })).toHaveAttribute('href', '/portal/subscriptions');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('supports desktop and mobile customer subscription navigation', async () => {
    const router = open('/portal/home');
    const desktop = await screen.findByRole('navigation', { name: 'Main navigation' });
    await userEvent.click(within(desktop).getByRole('link', { name: 'My subscriptions' }));
    await screen.findByRole('heading', { name: 'My subscriptions' });
    await userEvent.click(within(desktop).getByRole('link', { name: 'Home' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const mobile = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    await userEvent.click(within(mobile).getByRole('link', { name: 'My subscriptions' }));
    expect(router.state.location.pathname).toBe('/portal/subscriptions');
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('waits for authentication before rendering customer pages', () => {
    vi.mocked(authService.session).mockImplementation(() => new Promise(() => {})); open();
    expect(screen.getByRole('status', { name: 'Verifying your session' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My subscriptions' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([403, 500])('preserves session error/permission handling for HTTP %s', async status => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(status, 'SESSION_ERROR', 'Cannot verify access')); open();
    expect(await screen.findByRole('heading', { name: status === 403 ? 'Access unavailable' : 'Unable to verify your session' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My subscriptions' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('keeps the actual missing-user-ID session blocker closed', async () => {
    vi.mocked(authService.session).mockRejectedValue(new ApiError(0, 'SESSION_CONTRACT_MISMATCH', 'The authentication service did not return a user ID.'));
    open();
    expect(await screen.findByRole('heading', { name: 'Unable to verify your session' })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
