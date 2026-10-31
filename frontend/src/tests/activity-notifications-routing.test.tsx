import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { reportJson } from './report-fixtures';

const internal = { user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-csrf' };

function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}

beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(internal);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    reportJson({ items: [], total: 0, unread_count: 0, page: 1, page_size: 20, has_next: false }),
  );
});

describe('activity and notifications shared route integration', () => {
  it.each([
    ['ADMIN', '/app/activity', 'Activity Timeline', '/api/activity'],
    ['STAFF', '/app/activity', 'Activity Timeline', '/api/activity'],
    ['ADMIN', '/app/notifications', 'Notifications', '/api/notifications'],
    ['STAFF', '/app/notifications', 'Notifications', '/api/notifications'],
  ] as const)('renders %s at %s within the shared shell', async (role, path, title, endpoint) => {
    vi.mocked(authService.session).mockResolvedValue({ ...internal, user: { ...internal.user, role } });
    const router = open(path);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Activity Timeline' })).toHaveAttribute('href', '/app/activity');
    expect(within(nav).getByRole('link', { name: 'Notifications' })).toHaveAttribute('href', '/app/notifications');
    expect(within(nav).getByRole('link', { name: title })).toHaveAttribute('aria-current', 'page');
    expect(vi.mocked(globalThis.fetch).mock.calls.some(([url]) => String(url).startsWith(endpoint))).toBe(true);
  });

  it.each(['/app/activity', '/app/notifications'])('redirects CUSTOMER away from %s before any module requests', async path => {
    vi.mocked(authService.session).mockResolvedValue({
      ...internal,
      user: { ...internal.user, role: 'CUSTOMER', account_id: 'acct-1' },
    });
    const router = open(path);
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(screen.queryByRole('link', { name: 'Activity Timeline' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'STAFF'] as const)('exposes both links in mobile navigation for %s', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...internal, user: { ...internal.user, role } });
    const router = open('/app/overview');
    await userEvent.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const nav = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(nav).getAllByRole('link', { name: 'Activity Timeline' })).toHaveLength(1);
    expect(within(nav).getAllByRole('link', { name: 'Notifications' })).toHaveLength(1);
    await userEvent.click(within(nav).getByRole('link', { name: 'Notifications' }));
    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/notifications');
  });
});
