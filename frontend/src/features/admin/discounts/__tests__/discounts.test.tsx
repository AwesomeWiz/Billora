import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiscountsPage } from '../pages/DiscountsPage';
import { discountService } from '../services/discountService';
import { productService } from '../../products/services/productService';
import {
  rupeesToPaise,
  paiseToRupees,
  percentToBps,
  bpsToPercent,
  type DiscountRule,
} from '../types';
import { ApiError } from '../../../../lib/api/client';
import * as AuthModule from '../../../auth/AuthProvider';

// Mock services and auth
vi.mock('../services/discountService');
vi.mock('../../products/services/productService');
vi.mock('../../../auth/AuthProvider');

const mockDiscounts: DiscountRule[] = [
  {
    id: 'disc-1',
    name: 'Winter Festive 15%',
    kind: 'PERCENT',
    percent_bps: 1500,
    value_minor: null,
    scope: 'SUBSCRIPTION',
    product_id: null,
    min_quantity: null,
    min_purchase_minor: 100000, // ₹1,000.00
    starts_on: '2026-11-01',
    ends_on: '2026-12-31',
    max_uses: 100,
    uses_count: 25,
    priority: 10,
    active: true,
  },
  {
    id: 'disc-2',
    name: 'Flat ₹500 Off Enterprise',
    kind: 'FIXED',
    value_minor: 50000, // ₹500.00
    percent_bps: null,
    scope: 'PRODUCT',
    product_id: 'prod-123',
    product_name: 'Brightloop ERP Core',
    min_quantity: 5,
    min_purchase_minor: null,
    starts_on: null,
    ends_on: null,
    max_uses: null,
    uses_count: 8,
    priority: 5,
    active: false,
  },
];

describe('Discounts Management Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default admin session
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

    vi.mocked(productService.listProducts).mockResolvedValue({
      items: [
        {
          id: 'prod-123',
          name: 'Brightloop ERP Core',
          type: 'SERVICE',
          sales_price_minor: 1200000,
          cost_price_minor: 500000,
          currency: 'INR',
          created_at: '2026-10-31T09:00:00Z',
          active: true,
          variant_count: 0,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      has_next: false,
    });
  });

  describe('Financial Conversion Utilities', () => {
    it('converts rupees to paise minor units accurately', () => {
      expect(rupeesToPaise('100')).toBe(10000);
      expect(rupeesToPaise('100.50')).toBe(10050);
      expect(rupeesToPaise('0.25')).toBe(25);
      expect(rupeesToPaise('0')).toBe(0);
      expect(rupeesToPaise('-50')).toBeNull();
      expect(rupeesToPaise('abc')).toBeNull();
      expect(rupeesToPaise('')).toBeNull();
    });

    it('converts paise to formatted rupee strings accurately', () => {
      expect(paiseToRupees(10000, false)).toBe('100');
      expect(paiseToRupees(10050, false)).toBe('100.50');
      expect(paiseToRupees(0, false)).toBe('0');
      expect(paiseToRupees(10000, true)).toContain('100');
    });

    it('converts percentage input to basis points accurately', () => {
      expect(percentToBps('15')).toBe(1500);
      expect(percentToBps('18.5')).toBe(1850);
      expect(percentToBps('0.05')).toBe(5);
      expect(percentToBps('100')).toBe(10000);
      expect(percentToBps('101')).toBeNull(); // Above 100%
      expect(percentToBps('-5')).toBeNull(); // Negative
      expect(percentToBps('invalid')).toBeNull();
    });

    it('converts basis points to percentage display', () => {
      expect(bpsToPercent(1500, false)).toBe('15');
      expect(bpsToPercent(1850, false)).toBe('18.5');
      expect(bpsToPercent(1500, true)).toBe('15%');
      expect(bpsToPercent(1850, true)).toBe('18.5%');
    });
  });

  describe('Listing & Filtering', () => {
    it('renders loading state initially', () => {
      vi.mocked(discountService.listDiscounts).mockReturnValue(new Promise(() => {}));
      render(<DiscountsPage />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('renders discounts table with correct data and badges', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: mockDiscounts,
        total: 2,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Winter Festive 15%')).toBeInTheDocument();
      });

      expect(screen.getByText('Flat ₹500 Off Enterprise')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText(/1500 bps/i)).toBeInTheDocument();
      expect(screen.getByText('Whole Subscription', { selector: 'td span' })).toBeInTheDocument();
      expect(screen.getByText('Product Specific', { selector: 'td span' })).toBeInTheDocument();
      expect(screen.getByText(/Product: Brightloop ERP Core/i)).toBeInTheDocument();
      expect(screen.getByText('25 / 100')).toBeInTheDocument();
      expect(screen.getByText(/8 used/i)).toBeInTheDocument();
    });

    it('displays notice banner when discounts API is unavailable (404)', async () => {
      vi.mocked(discountService.listDiscounts).mockRejectedValue(
        new ApiError(404, 'NOT_FOUND', 'Not found')
      );

      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('discounts-unavailable-notice')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Discounts API Service Pending/i)
      ).toBeInTheDocument();
    });

    it('displays empty state when no discounts exist', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('No discount rules configured')).toBeInTheDocument();
      });
      expect(screen.getByText('Create First Discount')).toBeInTheDocument();
    });
  });

  describe('Role-Aware Behavior', () => {
    it('hides create button and table actions for STAFF users', async () => {
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

      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: mockDiscounts,
        total: 2,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Winter Festive 15%')).toBeInTheDocument();
      });

      expect(screen.queryByText('+ Create Discount')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Activate')).not.toBeInTheDocument();
      expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
    });
  });

  describe('Create Discount Rule', () => {
    it('validates required fields and percentage bounds', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      const user = userEvent.setup();
      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create Discount')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create Discount'));

      expect(screen.getByRole('heading', { name: 'Create Discount Rule' })).toBeInTheDocument();

      // Clear the default percent input
      const percentInput = screen.getByLabelText(/Percentage Discount/i);
      await user.clear(percentInput);

      // Submit empty
      await user.click(screen.getByRole('button', { name: 'Create Discount' }));

      expect(screen.getByText('Discount name is required.')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid percentage between 0.01% and 100%.')).toBeInTheDocument();
    });

    it('creates a FIXED discount with integer paise conversion', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });
      vi.mocked(discountService.createDiscount).mockResolvedValue({
        id: 'new-disc',
        name: 'Launch Special ₹250',
        kind: 'FIXED',
        value_minor: 25000,
        percent_bps: null,
        scope: 'SUBSCRIPTION',
        uses_count: 0,
        priority: 0,
        active: true,
      });

      const user = userEvent.setup();
      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create Discount')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create Discount'));

      // Enter name
      await user.type(screen.getByLabelText(/Discount Rule Name \*/i), 'Launch Special ₹250');

      // Switch type to FIXED
      await user.selectOptions(screen.getByLabelText(/Discount Type \*/i), 'FIXED');

      // Amount in rupees
      await user.type(screen.getByLabelText(/Discount Amount \(₹\) \*/i), '250');

      // Submit
      await user.click(screen.getByRole('button', { name: 'Create Discount' }));

      await waitFor(() => {
        expect(discountService.createDiscount).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Launch Special ₹250',
            kind: 'FIXED',
            value_minor: 25000,
            percent_bps: null,
            scope: 'SUBSCRIPTION',
            active: true,
          })
        );
      });
    });

    it('requires a product when scope is PRODUCT', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      const user = userEvent.setup();
      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create Discount')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create Discount'));

      await user.type(screen.getByLabelText(/Discount Rule Name \*/i), 'Targeted Offer');
      await user.selectOptions(screen.getByLabelText(/Scope \*/i), 'PRODUCT');

      // Attempt to submit without selecting product
      await user.click(screen.getByRole('button', { name: 'Create Discount' }));

      expect(
        screen.getByText('A product must be selected for product-specific discounts.')
      ).toBeInTheDocument();

      // Select product
      await user.selectOptions(screen.getByLabelText(/Target Product \*/i), 'prod-123');
      expect(
        screen.queryByText('A product must be selected for product-specific discounts.')
      ).not.toBeInTheDocument();
    });

    it('validates date range when end date precedes start date', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
        has_next: false,
      });

      const user = userEvent.setup();
      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create Discount')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create Discount'));

      await user.type(screen.getByLabelText(/Discount Rule Name \*/i), 'Invalid Dates');
      await user.type(screen.getByLabelText(/Effective From/i), '2026-12-31');
      await user.type(screen.getByLabelText(/Effective To/i), '2026-01-01');

      await user.click(screen.getByRole('button', { name: 'Create Discount' }));

      expect(screen.getByText('End date cannot be earlier than start date.')).toBeInTheDocument();
    });
  });

  describe('Activation & Edit Actions', () => {
    it('toggles active status via discountService.toggleActive with confirmation', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [mockDiscounts[0]],
        total: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      });
      vi.mocked(discountService.toggleActive).mockResolvedValue({
        ...mockDiscounts[0],
        active: false,
      });

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Winter Festive 15%')).toBeInTheDocument();
      });

      const deactivateBtn = screen.getByRole('button', { name: 'Deactivate' });
      fireEvent.click(deactivateBtn);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Are you sure you want to deactivate')
        );
        expect(discountService.toggleActive).toHaveBeenCalledWith('disc-1', false);
      });
    });

    it('pre-fills edit form modal and submits updates', async () => {
      vi.mocked(discountService.listDiscounts).mockResolvedValue({
        items: [mockDiscounts[0]],
        total: 1,
        page: 1,
        page_size: 20,
        has_next: false,
      });
      vi.mocked(discountService.updateDiscount).mockResolvedValue({
        ...mockDiscounts[0],
        name: 'Updated Winter Festive 20%',
        percent_bps: 2000,
      });

      const user = userEvent.setup();
      render(<DiscountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Winter Festive 15%')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Edit' }));

      expect(screen.getByRole('heading', { name: 'Edit Discount Rule' })).toBeInTheDocument();
      const nameInput = screen.getByLabelText(/Discount Rule Name \*/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Winter Festive 15%');

      // Change percentage to 20
      const percentInput = screen.getByLabelText(/Percentage Discount/i);
      await user.clear(percentInput);
      await user.type(percentInput, '20');

      await user.click(screen.getByRole('button', { name: 'Update Discount' }));

      await waitFor(() => {
        expect(discountService.updateDiscount).toHaveBeenCalledWith(
          'disc-1',
          expect.objectContaining({
            percent_bps: 2000,
          })
        );
      });
    });
  });
});
