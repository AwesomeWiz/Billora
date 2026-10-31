import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotationsPage } from '../pages/QuotationsPage';
import { quotationService } from '../services/quotationService';
import { customerApi } from '../../customer/api';
import { quotationTemplateService } from '../services/quotationTemplateService';
import { productService } from '../../admin/products/services/productService';
import { taxService } from '../../admin/taxes/services/taxService';
import { ApiError } from '../../../lib/api/client';
import type { Quotation } from '../types';

vi.mock('../services/quotationService');
vi.mock('../services/quotationTemplateService');
vi.mock('../../customer/api');
vi.mock('../../admin/products/services/productService');
vi.mock('../../admin/taxes/services/taxService');

const mockQuotations: Quotation[] = [
  {
    id: 'quot-1',
    number: 'QT-2026-0001',
    subscription_id: 'sub-101',
    account_id: 'acc-1',
    customer_name: 'Alpha Technologies',
    customer_email: 'finance@alpha.tech',
    issued_on: '2026-10-31',
    valid_until: '2026-11-30',
    status: 'ISSUED',
    subtotal_minor: 500000,
    tax_minor: 90000,
    total_minor: 590000,
    lines: [
      {
        id: 'line-1',
        quotation_id: 'quot-1',
        source_product_id: 'prod-1',
        product_name: 'Cloud Hosting Pro',
        quantity: 2,
        unit_price_minor: 250000,
        subtotal_minor: 500000,
      },
    ],
    subscription: {
      id: 'sub-101',
      status: 'QUOTATION',
    },
  },
  {
    id: 'quot-2',
    number: 'QT-2026-0002',
    subscription_id: 'sub-102',
    account_id: 'acc-2',
    customer_name: 'Beta Global Services',
    customer_email: 'billing@betaglobal.com',
    issued_on: '2026-10-15',
    valid_until: '2026-10-30',
    status: 'EXPIRED',
    subtotal_minor: 1200000,
    total_minor: 1200000,
    lines: [],
    subscription: {
      id: 'sub-102',
      status: 'DRAFT',
    },
  },
];

describe('QuotationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quotationService.listQuotations).mockResolvedValue({
      items: mockQuotations,
      total: 2,
      page: 1,
      page_size: 10,
      has_next: false,
    });
    vi.mocked(customerApi.list).mockResolvedValue({
      items: [
        { id: 'acc-1', display_name: 'Alpha Technologies', billing_email: 'finance@alpha.tech', currency: 'INR' },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      has_next: false,
    });
    vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 100,
      has_next: false,
    });
    vi.mocked(productService.listProducts).mockResolvedValue({
      items: [
        {
          id: 'prod-1',
          name: 'Cloud Hosting Pro',
          sales_price_minor: 250000,
          cost_price_minor: 150000,
          currency: 'INR',
          type: 'SERVICE',
          active: true,
          created_at: '2026-10-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      has_next: false,
    });
    vi.mocked(productService.listVariants).mockResolvedValue([
      {
        id: 'var-1',
        product_id: 'prod-1',
        attribute_name: 'Billing',
        attribute_value: 'Annual',
        price_delta_minor: 0,
        active: true,
      },
    ]);
    vi.mocked(taxService.listTaxes).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 100,
      has_next: false,
    });
  });

  it('renders quotations list successfully with numbers and customer details', async () => {
    render(<QuotationsPage />);

    expect(screen.getByText('Quotations')).toBeInTheDocument();
    expect(screen.getByText(/Issue, customize, review and confirm/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('QT-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Alpha Technologies')).toBeInTheDocument();
      expect(screen.getByText('QT-2026-0002')).toBeInTheDocument();
      expect(screen.getByText('Beta Global Services')).toBeInTheDocument();
    });
  });

  it('shows honest backend notice banner when endpoint returns 404', async () => {
    vi.mocked(quotationService.listQuotations).mockRejectedValueOnce(
      new ApiError(404, 'NOT_FOUND', 'Not found')
    );

    render(<QuotationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Backend Endpoint Notice/i)).toBeInTheDocument();
      expect(screen.getByText(/The `\/api\/quotations` backend endpoint is pending implementation/i)).toBeInTheDocument();
    });
  });

  it('opens detail modal with line items and financial totals', async () => {
    const user = userEvent.setup();
    render(<QuotationsPage />);

    await waitFor(() => {
      expect(screen.getByText('QT-2026-0001')).toBeInTheDocument();
    });

    // Click on quotation number to view detail
    await user.click(screen.getByRole('button', { name: 'QT-2026-0001' }));

    await waitFor(() => {
      expect(screen.getByText('Quotation: QT-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('Cloud Hosting Pro')).toBeInTheDocument();
      expect(screen.getByText('Linked Subscription')).toBeInTheDocument();
    });
  });

  it('confirms quotation successfully and triggers service call', async () => {
    const user = userEvent.setup();
    vi.mocked(quotationService.confirmQuotation).mockResolvedValueOnce({
      ...mockQuotations[0],
      status: 'ACCEPTED',
      subscription: { id: 'sub-101', status: 'CONFIRMED' },
    });

    render(<QuotationsPage />);

    await waitFor(() => {
      expect(screen.getByText('QT-2026-0001')).toBeInTheDocument();
    });

    // Click on Confirm button on the table
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirm' });
    await user.click(confirmButtons[0]);

    // Check modal confirmation dialog
    expect(screen.getByText(/Are you sure you want to confirm quotation/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Yes, Confirm Quotation' }));

    await waitFor(() => {
      expect(quotationService.confirmQuotation).toHaveBeenCalledWith('quot-1');
      expect(screen.getByText(/confirmed successfully!/i)).toBeInTheDocument();
    });
  });

  it('launches create quotation wizard modal', async () => {
    const user = userEvent.setup();
    render(<QuotationsPage />);

    const createButton = screen.getByRole('button', { name: '+ Create Quotation' });
    await user.click(createButton);

    expect(screen.getByText('Create New Quotation')).toBeInTheDocument();
    expect(screen.getByText('1. Customer & Template')).toBeInTheDocument();
  });
});
