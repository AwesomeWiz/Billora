import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GstManagementPage } from '../pages/GstManagementPage';
import { gstService } from '../services/gstService';
import { ApiError } from '../../../lib/api/client';

vi.mock('../services/gstService', () => ({
  gstService: {
    getIntelligenceSummary: vi.fn(),
    getSettings: vi.fn(),
    getTaxErrors: vi.fn(),
    approveTaxFix: vi.fn(),
  },
}));

describe('GstManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(gstService.getIntelligenceSummary).mockReturnValue(new Promise(() => {}));
    vi.mocked(gstService.getSettings).mockReturnValue(new Promise(() => {}));
    vi.mocked(gstService.getTaxErrors).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <GstManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading GST records\.\.\./i)).toBeInTheDocument();
  });

  it('handles backend 404 cleanly by showing informative banner', async () => {
    vi.mocked(gstService.getIntelligenceSummary).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );
    vi.mocked(gstService.getSettings).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );
    vi.mocked(gstService.getTaxErrors).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );

    render(
      <MemoryRouter>
        <GstManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Backend Endpoint Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/GST Phase 3E services \(`\/api\/gst\/\*`\) are pending backend implementation\./i)).toBeInTheDocument();
    });
  });

  it('renders intelligence overview metrics with paise conversion when loaded', async () => {
    vi.mocked(gstService.getIntelligenceSummary).mockResolvedValue({
      total_tax_collected_minor: 180000,
      cgst_collected_minor: 90000,
      sgst_collected_minor: 90000,
      igst_collected_minor: 0,
      pending_error_count: 0,
      currency: 'INR',
    });
    vi.mocked(gstService.getSettings).mockResolvedValue({
      composition_scheme: false,
      e_invoicing_enabled: true,
      reverse_charge_applicable: false,
    });
    vi.mocked(gstService.getTaxErrors).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <GstManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/₹1800\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Tax Collected/i)).toBeInTheDocument();
    });
  });
});
