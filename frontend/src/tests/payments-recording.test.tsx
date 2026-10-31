import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../features/auth/AuthProvider';
import { authService } from '../features/auth/service';
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage';
import { paymentAmountMinor, paymentRecordingBlocker, preparePayment, validatePaymentDraft } from '../features/billing/payment-intent';
import { api } from '../lib/api';
import { invoiceFixture, invoiceJson as json } from './invoice-fixtures';

const input = { amount: '200.50', paidAtLocal: '2026-10-31T16:00', note: 'Manual reconciliation' };
const session = { user: { id: 'test-staff', email: 'staff@example.test', role: 'STAFF' as const }, csrf_token: 'test-csrf' };
function open() {
  const router = createMemoryRouter([{ path: '/app/invoices/:id', element: <InvoiceDetailPage /> }], { initialEntries: ['/app/invoices/invoice-1'] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
async function fill(amount = input.amount) {
  const field = await screen.findByRole('textbox', { name: /Payment amount/ });
  fireEvent.change(field, { target: { value: amount } });
  fireEvent.change(screen.getByLabelText(/Payment date and time/), { target: { value: input.paidAtLocal } });
  fireEvent.change(screen.getByRole('textbox', { name: /Payment note/ }), { target: { value: input.note } });
}
beforeEach(() => {
  vi.spyOn(authService, 'session').mockResolvedValue(session);
  api.setCsrfToken('test-csrf');
});

describe('exact payment input and local eligibility', () => {
  it.each([['0.01', 1], ['200.50', 20050], ['862', 86200], [' 1.2 ', 120], ['90071992547409.91', Number.MAX_SAFE_INTEGER]])('parses %s exactly to %s paise', (value, amount) => {
    expect(paymentAmountMinor(String(value))).toBe(amount);
  });
  it.each(['', '0', '0.00', '-1', '1.001', '1e3', '1,000', 'NaN', 'Infinity', '90071992547409.92', '01.00'])('rejects unsafe or nonpositive amount %s', value => {
    expect(() => paymentAmountMinor(value)).toThrow();
  });
  it('allows partial or full remaining balance but refuses an excess without constructing a new balance', () => {
    expect(validatePaymentDraft(invoiceFixture, 'STAFF', input).amountMinor).toBe(20050);
    expect(validatePaymentDraft(invoiceFixture, 'STAFF', { ...input, amount: '862.00' }).amountMinor).toBe(86200);
    expect(() => validatePaymentDraft(invoiceFixture, 'STAFF', { ...input, amount: '862.01' })).toThrow(/exceeds/);
  });
  it('normalizes explicit IST date/time to UTC and retains the invoice binding', () => {
    const draft = validatePaymentDraft(invoiceFixture, 'ADMIN', input);
    expect(draft).toEqual({ invoiceId: 'invoice-1', currency: 'INR', amountMinor: 20050, paidAt: '2026-10-31T10:30:00.000Z', note: input.note });
  });
  it.each(['', '2026-02-30T16:00', '2026-10-31T24:00', '2026-10-31T16:60', '2026-10-31'])('rejects invalid payment time %s', paidAtLocal => {
    expect(() => validatePaymentDraft(invoiceFixture, 'STAFF', { ...input, paidAtLocal })).toThrow(/date and time/);
  });
  it.each(['DRAFT', 'CANCELLED', 'PAID'] as const)('blocks %s invoices independently of displayed balances', status => {
    expect(paymentRecordingBlocker({ ...invoiceFixture, status }, 'ADMIN')).toMatch(/Only collectible confirmed/);
  });
  it.each([
    { ...invoiceFixture, paid_minor: undefined }, { ...invoiceFixture, balance_minor: undefined },
    { ...invoiceFixture, paid_minor: invoiceFixture.total_minor, balance_minor: 0 }, { ...invoiceFixture, currency: 'USD' },
  ])('blocks missing, settled or unsupported-currency amounts (%j)', invoice => {
    expect(paymentRecordingBlocker(invoice, 'STAFF')).toBeTypeOf('string');
  });
  it.each(['CUSTOMER', undefined] as const)('blocks recording without an internal role (%s)', role => {
    expect(paymentRecordingBlocker(invoiceFixture, role)).toMatch(/Only administrators and staff/);
  });
  it('reuses the preparation key for identical normalized fields and changes it for explicit edits', () => {
    const uuid = vi.spyOn(crypto, 'randomUUID');
    const draft = validatePaymentDraft(invoiceFixture, 'STAFF', input);
    const first = preparePayment(null, draft);
    expect(preparePayment(first, { ...draft })).toBe(first);
    const second = preparePayment(first, { ...draft, amountMinor: 20051 });
    expect(second.key).not.toBe(first.key);
    expect(preparePayment(second, { ...draft, amountMinor: 20051 })).toBe(second);
    expect(uuid).toHaveBeenCalledTimes(2);
  });
});

describe('guarded manual payment preparation', () => {
  it.each(['ADMIN', 'STAFF'] as const)('offers %s a review but never enables unconfirmed methods or submission', async role => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role } });
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(invoiceFixture)); open();
    await fill();
    expect(screen.getByRole('textbox', { name: 'Invoice reference' })).toHaveValue('INV-000001');
    expect(screen.getByRole('textbox', { name: /Service-reported outstanding/ })).toHaveValue('₹862.00');
    expect(screen.getByRole('combobox', { name: 'Payment method' })).toBeDisabled();
    expect(screen.queryByRole('option', { name: /BANK_TRANSFER|Bank transfer/i })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Payment reference' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    const dialog = screen.getByRole('dialog', { name: 'Review payment for INV-000001' });
    expect(await within(dialog).findByText('₹862.00')).toBeInTheDocument();
    expect(within(dialog).getByText('₹200.50')).toBeInTheDocument();
    expect(within(dialog).getByText(/31 Oct 2026/)).toHaveAttribute('datetime', '2026-10-31T10:30:00.000Z');
    expect(within(dialog).getByText(input.note)).toBeInTheDocument();
    const submit = within(dialog).getByRole('button', { name: 'Record payment (unavailable)' });
    expect(submit).toBeDisabled(); expect(submit).toHaveAccessibleDescription(/Nothing has been recorded/);
    fireEvent.click(submit); fireEvent.click(submit);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET' && options.credentials === 'include')).toBe(true);
    expect(screen.queryByText('Payment recorded')).not.toBeInTheDocument();
  });

  it.each(['0', '-1', '0.001', '862.01'])('validates invalid or excessive amount %s before any review read', async amount => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(invoiceFixture)); open(); await fill(amount);
    await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    expect(screen.getByRole('textbox', { name: /Payment amount/ })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: /Payment amount/ })).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('prevents duplicate review requests and retains the same intent across explicit network retries', async () => {
    const uuid = vi.spyOn(crypto, 'randomUUID');
    let finish!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(invoiceFixture))
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockRejectedValueOnce(new TypeError('Network interrupted')).mockImplementation(async () => json(invoiceFixture));
    open(); await fill();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Review payment' }));
    expect(fetcher).toHaveBeenCalledTimes(2); expect(uuid).toHaveBeenCalledOnce();
    await act(async () => finish(json({}, 503)));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry balance check' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/No payment was submitted/);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry balance check' }));
    await within(dialog).findByText('₹862.00');
    expect(uuid).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledTimes(4);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Back to payment form' }));
    await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    await within(screen.getByRole('dialog')).findByText('₹862.00');
    expect(uuid).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('requires explicit review of edited unsubmitted fields to create a different preparation key', async () => {
    const uuid = vi.spyOn(crypto, 'randomUUID');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(invoiceFixture)); open(); await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    await within(screen.getByRole('dialog')).findByText('₹862.00');
    await userEvent.click(screen.getByRole('button', { name: 'Back to payment form' }));
    await fill('100.00'); await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    expect(uuid).toHaveBeenCalledTimes(2);
    expect(within(screen.getByRole('dialog')).getByText('₹100.00')).toBeInTheDocument();
  });

  it.each([403, 409])('handles HTTP %s without changing an intent or recording anything', async status => {
    const uuid = vi.spyOn(crypto, 'randomUUID');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(invoiceFixture)).mockImplementation(async () => json({}, status));
    open(); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByText(/No payment was submitted/);
    if (status === 403) expect(within(dialog).queryByRole('button', { name: 'Retry balance check' })).not.toBeInTheDocument();
    if (status === 409) expect(within(dialog).getByRole('button', { name: 'Refresh invoice and history' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Record payment (unavailable)' })).toBeDisabled();
    expect(uuid).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('reconciles a concurrent full settlement by refreshing invoice/history without deriving success from a review', async () => {
    const settled = { ...invoiceFixture, status: 'PAID', paid_minor: invoiceFixture.total_minor, balance_minor: 0 };
    let invoiceReads = 0;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
      if (String(url).includes('/payments?')) return json({ items: [], page: 1, page_size: 20, total: 0, has_next: false });
      return json(++invoiceReads === 1 ? invoiceFixture : settled);
    });
    open(); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText(/The invoice changed or the service reported a conflict/)).toBeInTheDocument();
    expect(within(dialog).getByText(/can no longer be reviewed/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Payment summary' })).getByText('Partially paid')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refresh invoice and history' }));
    await screen.findByRole('heading', { name: 'No payment entries in this response' });
    expect(within(screen.getByRole('region', { name: 'Payment summary' })).getByText('Paid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review payment' })).not.toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => String(url).includes('/payments?'))).toBe(true);
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it('aborts a dismissed balance check and ignores the late response', async () => {
    let finish!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(invoiceFixture)).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    open(); await fill(); await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to payment form' }));
    expect(fetcher.mock.calls[1][1]?.signal?.aborted).toBe(true);
    await act(async () => finish(json(invoiceFixture)));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review payment' })).toBeEnabled();
  });

  it('keeps submission blocked when the shared client has no CSRF token', async () => {
    api.setCsrfToken(null);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(invoiceFixture)); open(); await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    expect(screen.getByRole('button', { name: 'Record payment (unavailable)' })).toBeDisabled();
  });

  it('does not expose the payment form to CUSTOMER outside the outer router guard', async () => {
    vi.mocked(authService.session).mockResolvedValue({ ...session, user: { ...session.user, role: 'CUSTOMER' } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(invoiceFixture)); open();
    await screen.findByRole('heading', { name: 'INV-000001' });
    expect(screen.queryByRole('region', { name: 'Manual payment recording' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Payment history' })).not.toBeInTheDocument();
  });
});
