import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { reportJson, reportSummary } from './report-fixtures';

const session = { user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-csrf' };
function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input) === '/api/reports/summary'
    ? reportJson(reportSummary) : reportJson({ items: [], total: 0, page: 1, page_size: 20, has_next: false }));
});

describe('taxes and discounts routing permissions', () => {
  it.each([
    ['taxes', 'Tax Rules', 'No tax rules configured'],
    ['discounts', 'Discounts & Promotion Rules', 'No discount rules configured'],
  ])('mounts %s inside AppShell for ADMIN', async (module, heading, empty) => {
    open('/app/catalog/' + module);
    await screen.findByRole('heading', { name: heading });
    expect(await screen.findByRole('heading', { name: empty })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    for (const label of ['Taxes', 'Discounts']) expect(within(nav).getAllByRole('link', { name: label })).toHaveLength(1);
    expect(within(nav).queryByText('Taxes & discounts')).not.toBeInTheDocument();
    expect(within(nav).getByText('Staff').closest('[aria-disabled]')).toHaveAttribute('aria-disabled', 'true');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/' + module, expect.objectContaining({ method: 'GET', credentials: 'include' }));
  });

  it('keeps STAFF discounts read-only, including existing rule controls', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'STAFF' } });
    // Test-only rule ensures row edit/toggle actions are excluded, not just empty-state controls.
    vi.mocked(globalThis.fetch).mockResolvedValue(reportJson({ items: [{ id: 'test-rule', name: 'Test-only discount', kind: 'PERCENT', percent_bps: 1000, value_minor: null, scope: 'SUBSCRIPTION', active: true, uses_count: 0, created_at: '2026-10-31T00:00:00Z' }], total: 1, page: 1, page_size: 20, has_next: false }));
    open('/app/catalog/discounts');
    await screen.findByText('Test-only discount');
    expect(screen.queryByRole('button', { name: /create|edit|activate|deactivate/i })).not.toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Discounts' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Taxes' })).not.toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('denies STAFF the tax editor before loading its data', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'STAFF' } });
    const router = open('/app/catalog/taxes');
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/overview'));
    expect(screen.queryByRole('heading', { name: 'Tax Rules' })).not.toBeInTheDocument();
    expect(vi.mocked(globalThis.fetch).mock.calls.some(([url]) => String(url).startsWith('/api/taxes'))).toBe(false);
  });

  it.each(['taxes', 'discounts'])('denies CUSTOMER %s without requests', async module => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER', account_id: 'test-account' } });
    const router = open('/app/catalog/' + module);
    await screen.findByRole('heading', { name: 'Your billing, in one place' });
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('supports ADMIN desktop and mobile navigation without duplicate entries', async () => {
    const router = open('/app/catalog/products');
    const desktop = await screen.findByRole('navigation', { name: 'Main navigation' });
    await userEvent.click(within(desktop).getByRole('link', { name: 'Taxes' }));
    await screen.findByRole('heading', { name: 'Tax Rules' });
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const mobile = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    for (const name of ['Taxes', 'Discounts']) expect(within(mobile).getAllByRole('link', { name })).toHaveLength(1);
    await userEvent.click(within(mobile).getByRole('link', { name: 'Discounts' }));
    await screen.findByRole('heading', { name: 'Discounts & Promotion Rules' });
    expect(router.state.location.pathname).toBe('/app/catalog/discounts');
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
  });

  it('supports STAFF mobile Discounts access without a Taxes link', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'STAFF' } });
    open('/app/overview');
    await userEvent.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Workspace navigation' });
    const nav = within(drawer).getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(nav).queryByRole('link', { name: 'Taxes' })).not.toBeInTheDocument();
    await userEvent.click(within(nav).getByRole('link', { name: 'Discounts' }));
    await screen.findByRole('heading', { name: 'Discounts & Promotion Rules' });
    expect(screen.queryByRole('button', { name: /create discount/i })).not.toBeInTheDocument();
    await waitFor(() => expect(drawer).not.toHaveAttribute('open'));
  });

  it.each(['taxes', 'discounts'])('retains the %s backend-unavailable notice', async module => {
    vi.mocked(globalThis.fetch).mockImplementation(async () => reportJson({}, 404));
    open('/app/catalog/' + module);
    if (module === 'taxes') expect(await screen.findByRole('alert')).toHaveTextContent('Tax rules endpoint not mounted');
    else expect(await screen.findByTestId('discounts-unavailable-notice')).toHaveTextContent('Discounts API Service Pending');
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
