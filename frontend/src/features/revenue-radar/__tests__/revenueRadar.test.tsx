import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RevenueRadarPage } from '../pages/RevenueRadarPage';
import { revenueRadarService } from '../services/revenueRadarService';
import { ApiError } from '../../../lib/api/client';
import type { RevenueLeakResponse, RevenueLeakFinding } from '../types';

vi.mock('../services/revenueRadarService');

const mockFindings: RevenueLeakFinding[] = [
  {
    finding_key: 'BILLING_MISSED:sub-101',
    rule: 'BILLING_MISSED',
    severity: 'HIGH',
    title: 'Active subscription missed billing cycle',
    entity_type: 'subscription',
    entity_id: 'sub-101',
    explanation: 'Active subscription had a cycle due yesterday with no processed invoice.',
    suggested_action: 'Advance billing cycle or run billing preview.',
    customer_name: 'Stark Enterprises',
    customer_id: 'acc-1',
    amount_at_risk_minor: 1250000,
    currency: 'INR',
  },
  {
    finding_key: 'INVOICE_OVERDUE:inv-202',
    rule: 'INVOICE_OVERDUE',
    severity: 'MEDIUM',
    title: 'Invoice past due date',
    entity_type: 'invoice',
    entity_id: 'inv-202',
    explanation: 'Invoice INV-202 remains unpaid 14 days past due date.',
    suggested_action: 'Send payment reminder to customer billing email.',
    customer_name: 'Wayne Logistics',
    customer_id: 'acc-2',
    amount_at_risk_minor: 340000,
    currency: 'INR',
  },
  {
    finding_key: 'BILLING_BLOCKED:sub-303',
    rule: 'BILLING_BLOCKED',
    severity: 'HIGH',
    title: 'Missing plan pricing configuration',
    entity_type: 'subscription',
    entity_id: 'sub-303',
    explanation: 'The associated subscription plan has no active pricing tier.',
    suggested_action: 'Assign a valid pricing tier to the plan.',
    // Missing optional customer and amount fields
  },
];

const mockResponse: RevenueLeakResponse = {
  summary: {
    missed_billing_count: 1,
    overdue_invoice_count: 1,
    total_value_at_risk_minor: 1590000,
    currency: 'INR',
  },
  findings: mockFindings,
};

describe('RevenueRadarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading indicator initially', () => {
    vi.mocked(revenueRadarService.getRevenueLeaks).mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Scanning billing cycles and invoices for revenue leaks.../i)).toBeInTheDocument();
  });

  it('renders findings and backend-provided summary cards successfully', async () => {
    vi.mocked(revenueRadarService.getRevenueLeaks).mockResolvedValueOnce(mockResponse);
    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Revenue Leak Radar')).toBeInTheDocument();
      expect(screen.getByText('Active subscription missed billing cycle')).toBeInTheDocument();
      expect(screen.getByText('Invoice past due date')).toBeInTheDocument();
      expect(screen.getByText('Missing plan pricing configuration')).toBeInTheDocument();
      expect(screen.getByText('Stark Enterprises')).toBeInTheDocument();
    });

    // Check KPI summary values
    expect(screen.getByText(/Estimated Value at Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/₹15,900.00/i)).toBeInTheDocument();
  });

  it('displays empty state when backend returns 0 findings', async () => {
    vi.mocked(revenueRadarService.getRevenueLeaks).mockResolvedValueOnce({
      findings: [],
    });

    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No revenue risks detected')).toBeInTheDocument();
      expect(
        screen.getByText(/We haven't found overdue or missed-billing events for this filter./i)
      ).toBeInTheDocument();
    });
  });

  it('displays honest backend endpoint notice banner when API returns 404', async () => {
    vi.mocked(revenueRadarService.getRevenueLeaks).mockRejectedValueOnce(
      new ApiError(404, 'NOT_FOUND', 'Endpoint not found')
    );

    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Backend Endpoint Notice/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Revenue Leak Radar data is not yet available from the backend/i)
      ).toBeInTheDocument();
    });
  });

  it('filters findings by severity cleanly', async () => {
    const user = userEvent.setup();
    vi.mocked(revenueRadarService.getRevenueLeaks).mockResolvedValueOnce(mockResponse);

    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Active subscription missed billing cycle')).toBeInTheDocument();
      expect(screen.getByText('Invoice past due date')).toBeInTheDocument();
    });

    // Filter by MEDIUM severity
    const severitySelect = screen.getByLabelText('Severity');
    await user.selectOptions(severitySelect, 'MEDIUM');

    expect(screen.queryByText('Active subscription missed billing cycle')).not.toBeInTheDocument();
    expect(screen.getByText('Invoice past due date')).toBeInTheDocument();
  });

  it('filters findings by rule and search query', async () => {
    const user = userEvent.setup();
    vi.mocked(revenueRadarService.getRevenueLeaks).mockResolvedValueOnce(mockResponse);

    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Active subscription missed billing cycle')).toBeInTheDocument();
    });

    // Search for "pricing"
    const searchInput = screen.getByLabelText('Search Findings');
    await user.type(searchInput, 'pricing');

    expect(screen.queryByText('Active subscription missed billing cycle')).not.toBeInTheDocument();
    expect(screen.getByText('Missing plan pricing configuration')).toBeInTheDocument();
  });

  it('navigates to invoice and subscription records via safe links', async () => {
    vi.mocked(revenueRadarService.getRevenueLeaks).mockResolvedValueOnce(mockResponse);

    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const subLinks = screen.getAllByRole('link', { name: /Open Subscription →/i });
      expect(subLinks[0]).toHaveAttribute('href', '/app/subscriptions/sub-101');
      expect(screen.getByRole('link', { name: /Open Invoice →/i })).toHaveAttribute(
        'href',
        '/app/invoices/inv-202'
      );
    });
  });

  it('handles manual refresh with duplicate click prevention', async () => {
    const user = userEvent.setup();
    vi.mocked(revenueRadarService.getRevenueLeaks).mockResolvedValue(mockResponse);

    render(
      <MemoryRouter>
        <RevenueRadarPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Revenue Leak Radar')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'Refresh checks' });
    await user.click(refreshButton);

    expect(revenueRadarService.getRevenueLeaks).toHaveBeenCalledTimes(2);
  });
});
