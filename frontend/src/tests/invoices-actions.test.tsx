import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage';
import { invoiceReviewBlocker } from '../features/billing/invoice-actions';
import { api } from '../lib/api';
import { invoiceDraftFixture as draft, invoiceFixture, invoiceJson as json } from './invoice-fixtures';

function open() {
  const router = createMemoryRouter([{ path: '/app/invoices/:id', element: <InvoiceDetailPage /> }], { initialEntries: ['/app/invoices/invoice-1'] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => {
  api.setCsrfToken('test-only-csrf');
  vi.spyOn(authService, 'session').mockResolvedValue({ user: { id: 'test-staff', email: 'staff@example.test', role: 'STAFF' }, csrf_token: 'test-only-csrf' });
});

describe('invoice action eligibility', () => {
  it.each(['ADMIN', 'STAFF'] as const)('allows %s to review a complete unpaid draft', role => {
    expect(invoiceReviewBlocker(draft, role, 'confirm')).toBeNull();
    expect(invoiceReviewBlocker(draft, role, 'cancel')).toBeNull();
  });
  it('allows review of cancellation for an unpaid confirmed invoice', () => {
    expect(invoiceReviewBlocker({ ...draft, status: 'CONFIRMED' }, 'STAFF', 'cancel')).toBeNull();
  });
  it.each([
    { ...draft, status: 'PAID' as const, paid_minor: draft.total_minor, balance_minor: 0 },
    { ...draft, status: 'CANCELLED' as const },
    { ...draft, paid_minor: undefined },
    { ...invoiceFixture },
    { ...draft, payments: [{ id: 'payment-1', method: 'BANK_TRANSFER', paid_at: '2026-10-31T09:00:00Z', amount_minor: 1 }] },
  ])('blocks cancellation when payment/state eligibility is unsafe (%j)', invoice => {
    expect(invoiceReviewBlocker(invoice, 'ADMIN', 'cancel')).toBeTypeOf('string');
  });
  it.each([
    { ...draft, status: 'CONFIRMED' as const },
    { ...draft, subtotal_minor: undefined },
    { ...draft, tax_minor: undefined },
    { ...draft, discount_minor: undefined },
    { ...draft, lines: [] },
  ])('blocks confirmation of ineligible or incomplete drafts (%j)', invoice => {
    expect(invoiceReviewBlocker(invoice, 'STAFF', 'confirm')).toBeTypeOf('string');
  });
  it.each(['CUSTOMER', undefined] as const)('rejects review without an internal role (%s)', role => {
    expect(invoiceReviewBlocker(draft, role, 'confirm')).toBeTypeOf('string');
    expect(invoiceReviewBlocker(draft, role, 'cancel')).toBeTypeOf('string');
  });
});

describe('invoice action review with unavailable write contracts', () => {
  it('checks fresh totals in an explicit confirmation dialog, prevents duplicate checks and never POSTs', async () => {
    let finish!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(draft))
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open();
    const review = await screen.findByRole('button', { name: 'Review confirmation' });
    await userEvent.dblClick(review);
    const dialog = screen.getByRole('dialog', { name: 'Confirm INV-000001?' });
    expect(within(dialog).getByRole('status')).toHaveTextContent('Checking the current invoice');
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => finish(json(draft)));
    expect(within(dialog).getByText('₹1,062.00')).toBeInTheDocument();
    const submit = within(dialog).getByRole('button', { name: 'Confirm invoice (unavailable)' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit); fireEvent.click(submit);
    expect(within(dialog).getByText(/request and response contracts are not confirmed/)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET' && options.credentials === 'include')).toBe(true);
  });

  it('explains cancellation consequences and leaves the invoice unchanged after dismissal', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(draft));
    open(); await userEvent.click(await screen.findByRole('button', { name: 'Review cancellation' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel INV-000001?' });
    expect(within(dialog).getByText(/does not delete payments, erase processed billing cycles/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel invoice (unavailable)' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Back to invoice' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('This is a draft. Amounts may change before the invoice is confirmed.')).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it.each([403, 409, 503])('handles HTTP %s in a review without enabling a mutation', async status => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(draft))
      .mockImplementation(async () => json({}, status));
    open(); await userEvent.click(await screen.findByRole('button', { name: 'Review confirmation' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText(/No invoice change has been submitted/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Confirm invoice (unavailable)' })).toBeDisabled();
    if (status === 403) expect(within(dialog).queryByRole('button', { name: 'Retry invoice check' })).not.toBeInTheDocument();
    if (status === 409) expect(within(dialog).getByRole('button', { name: 'Refresh invoice' })).toBeInTheDocument();
    if (status === 503) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Retry invoice check' }));
      expect(fetcher).toHaveBeenCalledTimes(3);
    }
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('requires refresh if a payment arrives after the original invoice was loaded', async () => {
    const latest = { ...draft, status: 'CONFIRMED', paid_minor: 20000, balance_minor: 86200 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(draft)).mockImplementation(async () => json(latest));
    open(); await userEvent.click(await screen.findByRole('button', { name: 'Review cancellation' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText(/The invoice changed or the service reported a conflict/)).toBeInTheDocument();
    expect(within(dialog).getByText(/An invoice with recorded payments cannot be cancelled/)).toBeInTheDocument();
    expect(within(dialog).getByText('₹200.00')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refresh invoice' }));
    expect(await screen.findByRole('button', { name: 'Review cancellation' })).toBeDisabled();
  });

  it('aborts a dismissed review and ignores its late response', async () => {
    let finish!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(draft))
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open(); await userEvent.click(await screen.findByRole('button', { name: 'Review confirmation' }));
    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(fetcher.mock.calls[1][1]?.signal?.aborted).toBe(true);
    await act(async () => finish(json(draft)));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review confirmation' })).toBeEnabled();
  });

  it('shows ineligible actions as disabled for a partial payment', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(invoiceFixture)); open();
    expect(await screen.findByRole('button', { name: 'Review cancellation' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review confirmation' })).toBeDisabled();
    expect(screen.getByText(/An invoice with recorded payments cannot be cancelled/)).toBeInTheDocument();
  });

  it('does not render action reviews for CUSTOMER even outside the central route guard', async () => {
    vi.mocked(authService.session).mockResolvedValue({ user: { id: 'test-customer', email: 'customer@example.test', role: 'CUSTOMER' }, csrf_token: 'test-only-csrf' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(draft)); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    expect(screen.queryByRole('region', { name: 'Invoice actions' })).not.toBeInTheDocument();
  });
});
