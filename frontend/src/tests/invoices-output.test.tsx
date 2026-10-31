import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage';
import { invoiceDraftFixture as draft, invoiceJson as json } from './invoice-fixtures';

const confirmed = { ...draft, status: 'CONFIRMED' };
const session = { user: { id: 'test-admin', email: 'admin@example.test', role: 'ADMIN' as const }, csrf_token: 'test-only-csrf' };
function open(fullRoutes = false) {
  const router = createMemoryRouter(fullRoutes ? routeConfig : [{ path: '/app/invoices/:id', element: <InvoiceDetailPage /> }], { initialEntries: ['/app/invoices/invoice-1'] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => { vi.spyOn(authService, 'session').mockResolvedValue(session); });

describe('truthful invoice delivery information', () => {
  it('keeps sending disabled and missing delivery evidence unverified', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(confirmed)); open();
    const delivery = await screen.findByRole('region', { name: 'Invoice delivery' });
    expect(within(delivery).getByText('Delivery not verified')).toBeInTheDocument();
    const send = within(delivery).getByRole('button', { name: 'Send invoice (unavailable)' });
    expect(send).toBeDisabled();
    expect(send).toHaveAccessibleDescription(/request, delivery result, and duplicate-send contracts/);
    fireEvent.click(send); fireEvent.click(send);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][1]?.method).toBe('GET');
  });

  it('shows the documented send timestamp as a record, never as confirmed delivery', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...confirmed, sent_at: '2026-10-31T09:00:00Z' })); open();
    const delivery = await screen.findByRole('region', { name: 'Invoice delivery' });
    expect(within(delivery).getByText(/Send timestamp reported by the service/)).toHaveTextContent('This does not establish delivery');
    expect(within(delivery).getByText(/31 Oct 2026/)).toHaveAttribute('datetime', '2026-10-31T09:00:00Z');
    expect(within(delivery).getByText('Delivery not verified')).toBeInTheDocument();
    expect(within(delivery).queryByText('Delivered', { exact: true })).not.toBeInTheDocument();
  });

  it.each(['SENT', 'DELIVERED', 'PREVIEW_ONLY', 'FAILED', 'QUEUED'])('does not turn an unagreed delivery_status=%s projection into a delivery claim', async delivery_status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...confirmed, delivery_status })); open();
    const delivery = await screen.findByRole('region', { name: 'Invoice delivery' });
    expect(within(delivery).getByText('Delivery not verified')).toBeInTheDocument();
    expect(within(delivery).queryByText(delivery_status, { exact: true })).not.toBeInTheDocument();
  });

  it.each(['not-a-timestamp', '2026-02-30T09:00:00Z'])('rejects malformed sent_at=%s without exposing invoice actions', async sent_at => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...confirmed, sent_at })); open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Invoice delivery' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print invoice' })).not.toBeInTheDocument();
  });
});

describe('browser invoice printing', () => {
  it.each(['ADMIN', 'STAFF'] as const)('allows %s to print the loaded snapshot within the protected shell', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(confirmed));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    open(true);
    const control = await screen.findByRole('button', { name: 'Print invoice' }, { timeout: 3000 });
    const document = screen.getByRole('article', { name: 'Invoice INV-000001' });
    expect(within(document).getByRole('table', { name: 'Invoice line items' })).toBeInTheDocument();
    expect(within(document).getByText('Historical support seats')).toBeInTheDocument();
    expect(within(document).getByRole('cell', { name: '₹500.00' })).toBeInTheDocument();
    expect(within(document).getByText('Confirmed')).toBeInTheDocument();
    await userEvent.dblClick(control);
    expect(print).toHaveBeenCalledOnce();
    expect(control).toBeDisabled();
    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(control).toBeEnabled();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(screen.queryByText('Printed successfully')).not.toBeInTheDocument();
    expect(screen.queryByText('Delivered', { exact: true })).not.toBeInTheDocument();
    expect(within(document).getByText('Confirmed')).toBeInTheDocument();
  });

  it.each(['DRAFT', 'CANCELLED'] as const)('keeps %s identity on the printable document', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...draft, status }));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {}); open();
    const control = await screen.findByRole('button', { name: 'Print invoice' });
    expect(control).toHaveAccessibleDescription(new RegExp(status === 'DRAFT' ? 'Draft copy' : 'Cancelled copy'));
    const document = screen.getByRole('article');
    expect(within(document).getByText(status === 'DRAFT' ? 'Draft' : 'Cancelled')).toBeInTheDocument();
    await userEvent.click(control);
    expect(print).toHaveBeenCalledOnce();
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('prints sparse snapshots without substituting catalog prices or missing financial values', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...confirmed, lines: undefined, subtotal_minor: undefined, tax_minor: undefined, discount_minor: undefined }));
    const print = vi.spyOn(window, 'print').mockImplementation(() => {}); open();
    await userEvent.click(await screen.findByRole('button', { name: 'Print invoice' }));
    expect(print).toHaveBeenCalledOnce();
    const document = screen.getByRole('article');
    expect(within(document).getByRole('heading', { name: 'Invoice lines unavailable' })).toBeInTheDocument();
    expect(within(document).getAllByText('Not provided')).toHaveLength(3);
    expect(fetcher).toHaveBeenCalledOnce();
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('reports a browser print failure without claiming completion and allows another attempt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(confirmed));
    const print = vi.spyOn(window, 'print').mockImplementationOnce(() => { throw new Error('Print unavailable'); }).mockImplementation(() => {}); open();
    const control = await screen.findByRole('button', { name: 'Print invoice' });
    await userEvent.click(control);
    expect(screen.getByRole('alert')).toHaveTextContent('The print dialog could not open');
    expect(control).toBeEnabled();
    await userEvent.click(control);
    expect(print).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('removes the print listener when navigating away', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => json(String(input).endsWith('invoice-2') ? { ...confirmed, id: 'invoice-2', number: 'INV-000002' } : confirmed));
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const remove = vi.spyOn(window, 'removeEventListener');
    const router = open();
    await userEvent.click(await screen.findByRole('button', { name: 'Print invoice' }));
    await act(async () => { await router.navigate('/app/invoices/invoice-2'); });
    expect(await screen.findByRole('heading', { name: 'INV-000002' })).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith('afterprint', expect.any(Function));
    expect(screen.getByRole('button', { name: 'Print invoice' })).toBeEnabled();
  });

  it('provides neither print nor send controls after an invoice read fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 403)); open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print invoice' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send invoice (unavailable)' })).not.toBeInTheDocument();
  });

  it('keeps print/send controls hidden from CUSTOMER even without the outer guard', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER' } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(confirmed)); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    expect(screen.queryByRole('region', { name: 'Invoice printing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Invoice delivery' })).not.toBeInTheDocument();
  });
});
