import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuotationTemplatesPage } from '../pages/QuotationTemplatesPage';
import { quotationTemplateService } from '../services/quotationTemplateService';
import { planService } from '../../admin/plans/services/planService';
import { productService } from '../../admin/products/services/productService';
import { taxService } from '../../admin/taxes/services/taxService';
import { rupeesToPaise, paiseToRupees, type QuotationTemplate } from '../types';
import { ApiError } from '../../../lib/api/client';
import * as AuthModule from '../../auth/AuthProvider';

vi.mock('../services/quotationTemplateService');
vi.mock('../../admin/plans/services/planService');
vi.mock('../../admin/products/services/productService');
vi.mock('../../admin/taxes/services/taxService');
vi.mock('../../auth/AuthProvider');

const mockTemplates: QuotationTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Standard SaaS Growth Package',
    plan_id: 'plan-1',
    plan_name: 'Growth Monthly',
    validity_days: 30,
    active: true,
    created_at: '2026-10-31T10:00:00Z',
    lines: [
      {
        id: 'line-1',
        template_id: 'tpl-1',
        product_id: 'prod-1',
        product_name: 'Brightloop ERP Core',
        variant_id: 'var-1',
        variant_name: 'Cloud Hosted',
        quantity: 2,
        unit_price_minor: 120000,
        tax_rule_id: 'tax-1',
        tax_rule_name: 'GST 18%',
      },
    ],
  },
];

describe('Quotation Templates Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      state: {
        status: 'authenticated',
        user: { id: 'admin-1', email: 'admin@billora.com', role: 'ADMIN' },
      },
      refresh: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(planService.listPlans).mockResolvedValue({
      items: [
        {
          id: 'plan-1',
          name: 'Growth Monthly',
          base_fee_minor: 500000,
          currency: 'INR',
          bill_plan_base_fee: true,
          billing_interval: 'MONTHLY',
          min_quantity: 1,
          available_from: '2026-01-01',
          auto_close: false,
          can_close_early: true,
          can_pause: true,
          can_renew: true,
          active: true,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      has_next: false,
    });

    vi.mocked(productService.listProducts).mockResolvedValue({
      items: [
        {
          id: 'prod-1',
          name: 'Brightloop ERP Core',
          type: 'SERVICE',
          sales_price_minor: 1200000,
          cost_price_minor: 500000,
          currency: 'INR',
          created_at: '2026-10-31T09:00:00Z',
          active: true,
          variant_count: 1,
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
        attribute_name: 'Hosting',
        attribute_value: 'Cloud Hosted',
        price_delta_minor: 56000,
        active: true,
      },
    ]);

    vi.mocked(taxService.listTaxes).mockResolvedValue({
      items: [
        {
          id: 'tax-1',
          name: 'GST 18%',
          rate_bps: 1800,
          scope: 'GLOBAL',
          active: true,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      has_next: false,
    });
  });

  describe('Conversion Utilities', () => {
    it('converts rupees to paise minor units correctly', () => {
      expect(rupeesToPaise('1200')).toBe(120000);
      expect(rupeesToPaise('1200.50')).toBe(120050);
      expect(rupeesToPaise('0')).toBe(0);
      expect(rupeesToPaise('-10')).toBeNull();
      expect(rupeesToPaise('abc')).toBeNull();
    });

    it('converts paise to rupees correctly', () => {
      expect(paiseToRupees(120000, false)).toBe('1200');
      expect(paiseToRupees(120050, false)).toBe('1200.50');
      expect(paiseToRupees(120000, true)).toContain('1,200');
    });
  });

  describe('Listing & Filtering', () => {
    it('renders loading state initially', () => {
      vi.mocked(quotationTemplateService.listTemplates).mockReturnValue(new Promise(() => {}));
      render(<QuotationTemplatesPage />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('renders template table with plan, validity, and line count', async () => {
      vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
        items: mockTemplates,
        total: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText('Standard SaaS Growth Package')).toBeInTheDocument();
      });

      expect(screen.getByText('Growth Monthly')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText(/1 product line/i)).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('displays notice banner when API returns 404', async () => {
      vi.mocked(quotationTemplateService.listTemplates).mockRejectedValue(
        new ApiError(404, 'NOT_FOUND', 'Not found')
      );

      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByTestId('templates-unavailable-notice')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/Quotation Templates API Pending/i)
      ).toBeInTheDocument();
    });

    it('opens view details modal when clicking View Details', async () => {
      vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
        items: mockTemplates,
        total: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      const user = userEvent.setup();
      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText('Standard SaaS Growth Package')).toBeInTheDocument();
      });

      await user.click(screen.getByText('View Details'));

      expect(screen.getByRole('heading', { name: 'Standard SaaS Growth Package' })).toBeInTheDocument();
      expect(screen.getByText(/Variant: Cloud Hosted/i)).toBeInTheDocument();
      expect(screen.getByText('Quantity: 2')).toBeInTheDocument();
      expect(screen.getByText('₹1200.00')).toBeInTheDocument();
      expect(screen.getByText('Tax: GST 18%')).toBeInTheDocument();
    });
  });

  describe('Authorization Behavior', () => {
    it('allows STAFF to view and create templates', async () => {
      vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
        state: {
          status: 'authenticated',
          user: { id: 'staff-1', email: 'staff@billora.com', role: 'STAFF' },
        },
        refresh: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
        items: mockTemplates,
        total: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText('Standard SaaS Growth Package')).toBeInTheDocument();
      });

      expect(screen.getByText('+ Create Template')).toBeInTheDocument();
    });

    it('denies CUSTOMER access to create button', async () => {
      vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
        state: {
          status: 'authenticated',
          user: { id: 'cust-1', email: 'customer@client.com', role: 'CUSTOMER', account_id: 'acc-1' },
        },
        refresh: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText('No quotation templates configured')).toBeInTheDocument();
      });

      expect(screen.queryByText('+ Create Template')).not.toBeInTheDocument();
      expect(screen.queryByText('Create First Template')).not.toBeInTheDocument();
    });
  });

  describe('Template Creation & Line Editor', () => {
    it('validates required fields, validity duration > 0, and non-empty lines', async () => {
      vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      const user = userEvent.setup();
      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create Template')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create Template'));

      expect(screen.getByRole('heading', { name: 'Create Reusable Quotation Template' })).toBeInTheDocument();

      // Clear validity
      const validityInput = screen.getByLabelText(/Validity \(Days\) \*/i);
      await user.clear(validityInput);
      await user.type(validityInput, '0');

      // Attempt submit with empty name
      fireEvent.submit(screen.getByRole('button', { name: 'Save Template' }).closest('form')!);

      expect(screen.getByText('Template name is required.')).toBeInTheDocument();
      expect(
        screen.getByText('Validity duration must be a positive integer greater than zero.')
      ).toBeInTheDocument();
    });

    it('creates a new template with product lines and blueprint preview', async () => {
      vi.mocked(quotationTemplateService.listTemplates).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });
      vi.mocked(quotationTemplateService.createTemplate).mockResolvedValue(mockTemplates[0]);

      const user = userEvent.setup();
      render(<QuotationTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create Template')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create Template'));

      await user.type(screen.getByLabelText(/Template Name \*/i), 'Enterprise Package');

      // Check live blueprint preview
      expect(screen.getByText('Template Configuration Preview')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Package')).toBeInTheDocument();

      // Submit
      await user.click(screen.getByRole('button', { name: 'Save Template' }));

      await waitFor(() => {
        expect(quotationTemplateService.createTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Enterprise Package',
            plan_id: 'plan-1',
            validity_days: 30,
            active: true,
            lines: expect.arrayContaining([
              expect.objectContaining({
                product_id: 'prod-1',
                quantity: 1,
              }),
            ]),
          })
        );
      });
    });
  });
});
