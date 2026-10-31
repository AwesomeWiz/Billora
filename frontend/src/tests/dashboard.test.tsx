import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceHome } from '../features/dashboard/WorkspaceHome';
import { parseFinancialSummary } from '../features/dashboard/summary-api';
import { formatMoney } from '../lib/format';
import { reportJson as json, reportSummary as summary } from './report-fixtures';

function open() { return render(<MemoryRouter><WorkspaceHome /></MemoryRouter>); }
function metric(label: string) { return screen.getByRole('heading', { name: label }).closest('article')!; }

describe('server financial overview', () => {
  it('renders all six server metrics with collected cash distinct from confirmed invoicing', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(summary)); open();
    await screen.findByText('Server report period:', { exact: false });
    expect(within(metric('Active subscriptions')).getByText('37')).toBeInTheDocument();
    expect(within(metric('Collected revenue')).getByText('₹1,234.56')).toBeInTheDocument();
    expect(within(metric('Confirmed invoiced revenue')).getByText('₹2,987.65')).toBeInTheDocument();
    expect(within(metric('Outstanding receivables')).getByText('₹987.65')).toBeInTheDocument();
    expect(within(metric('Overdue invoice count')).getByText('3')).toBeInTheDocument();
    expect(within(metric('Overdue invoice amount')).getByText('₹250.00')).toBeInTheDocument();
    expect(screen.getByText('1 Oct 2026')).toHaveAttribute('datetime', summary.range.from);
    expect(screen.getByText('31 Oct 2026')).toHaveAttribute('datetime', summary.range.to);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith('/api/reports/summary', expect.objectContaining({ method: 'GET', credentials: 'include' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows loading skeletons without zero or invented metrics', async () => {
    let finish!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; })); open();
    expect(screen.getByRole('status', { name: 'Loading collected revenue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh financial summary' })).toBeDisabled();
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
    await act(async () => finish(json(summary)));
    expect(within(metric('Collected revenue')).getByText('₹1,234.56')).toBeInTheDocument();
  });

  it('distinguishes a valid all-zero report from missing data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...summary, active_subscriptions: 0, collected_minor: 0, confirmed_invoiced_minor: 0, outstanding_minor: 0, overdue_count: 0, overdue_minor: 0 })); open();
    expect(await screen.findByRole('heading', { name: 'No financial activity in this report' })).toBeInTheDocument();
    expect(within(metric('Collected revenue')).getByText('₹0.00')).toBeInTheDocument();
    expect(within(metric('Overdue invoice count')).getByText('0')).toBeInTheDocument();
    expect(screen.queryByLabelText('Not available')).not.toBeInTheDocument();
  });

  it('uses the shared formatter for the report currency without coercing it to INR', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...summary, currency: 'USD' })); open();
    expect(await screen.findByText(formatMoney(summary.collected_minor, 'USD'))).toBeInTheDocument();
    expect(screen.queryByText('₹1,234.56')).not.toBeInTheDocument();
  });

  it.each([403, 404, 503])('handles HTTP %s without presenting financial zeros', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, status)); open();
    const alert = await screen.findByRole('alert');
    if (status === 403) {
      expect(alert).toHaveTextContent('Financial summary access denied');
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    }
    if (status === 404) expect(alert).toHaveTextContent('Financial summary unavailable');
    expect(screen.getAllByLabelText('Not available')).toHaveLength(6);
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
  });

  it('retries a network failure explicitly without loading list pages to calculate totals', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Disconnected')).mockResolvedValueOnce(json(summary)); open();
    await screen.findByRole('heading', { name: 'Unable to load financial summary' });
    expect(fetcher).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('₹1,234.56')).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([url, options]) => url === '/api/reports/summary' && options?.method === 'GET')).toBe(true);
  });

  it('clears previous amounts while refreshing and waits for replacement server metrics', async () => {
    let finish!: (response: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json(summary)).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); open();
    await screen.findByText('₹1,234.56');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh financial summary' }));
    expect(screen.queryByText('₹1,234.56')).not.toBeInTheDocument();
    await act(async () => finish(json({ ...summary, collected_minor: 321000 })));
    expect(within(metric('Collected revenue')).getByText('₹3,210.00')).toBeInTheDocument();
    expect(within(metric('Confirmed invoiced revenue')).getByText('₹2,987.65')).toBeInTheDocument();
  });

  it.each([
    {}, { ...summary, collected_minor: undefined }, { ...summary, collected_minor: '123456' },
    { ...summary, confirmed_invoiced_minor: 1.5 }, { ...summary, outstanding_minor: -1 },
    { ...summary, active_subscriptions: 1.5 }, { ...summary, overdue_count: -1 },
    { ...summary, overdue_minor: Number.MAX_SAFE_INTEGER + 1 }, { ...summary, currency: undefined },
    { ...summary, currency: 'rupees' }, { ...summary, range: undefined },
    { ...summary, range: { from: '2026-02-30', to: '2026-10-31' } },
    { ...summary, range: { from: '2026-11-01', to: '2026-10-31' } },
  ])('rejects missing, unsafe or ambiguous report fields (%j)', invalid => {
    expect(() => parseFinancialSummary(invalid)).toThrow(/complete, valid financial summary/);
  });

  it('does not substitute missing invoiced revenue with collected payments in a successful HTTP response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...summary, confirmed_invoiced_minor: undefined })); open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Missing amounts are not treated as zero');
    expect(screen.queryByText('₹1,234.56')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Not available')).toHaveLength(6);
  });

  it('does not impose an unconfirmed arithmetic relationship across independent metrics', () => {
    const independent = { ...summary, collected_minor: 900000, confirmed_invoiced_minor: 100, outstanding_minor: 800000 };
    expect(parseFinancialSummary(independent)).toEqual(independent);
  });

  it('keeps existing billing workspace destinations available without starting mutations', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(summary)); open(); await screen.findByText('₹1,234.56');
    const workspace = screen.getByRole('region', { name: 'Billing workspace' });
    expect(within(workspace).getByRole('link', { name: /Subscriptions/ })).toHaveAttribute('href', '/app/subscriptions');
    expect(within(workspace).getByRole('link', { name: /Invoices & payments/ })).toHaveAttribute('href', '/app/invoices');
    expect(within(workspace).getByRole('link', { name: /Customers/ })).toHaveAttribute('href', '/app/customers');
  });
});
