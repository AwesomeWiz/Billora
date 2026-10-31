import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../../lib/api/client';
import { taxService } from '../services/taxService';
import { productService } from '../../products/services/productService';
import { percentToBps, bpsToPercent, type TaxRule } from '../types';
import { validateTaxForm } from '../components/TaxFormModal';
import { TaxesPage } from '../pages/TaxesPage';

const mockGlobalTax: TaxRule = {
  id: 'tax-gst-18',
  name: 'GST 18%',
  rate_bps: 1800,
  scope: 'GLOBAL',
  product_id: null,
  effective_from: '2026-10-31',
  effective_to: '2027-10-31',
  active: true,
};

const mockProductTax: TaxRule = {
  id: 'tax-hardware-28',
  name: 'Hardware Luxury Tax',
  rate_bps: 2800,
  scope: 'PRODUCT',
  product_id: 'prod-helpdesk',
  product_name: 'Helpdesk Terminal',
  effective_from: '2026-10-31',
  effective_to: null,
  active: false,
};

describe('Tax rate and basis points conversion utilities', () => {
  it('converts percentages accurately into integer basis points', () => {
    expect(percentToBps('18')).toBe(1800);
    expect(percentToBps('18.00')).toBe(1800);
    expect(percentToBps('5.25')).toBe(525);
    expect(percentToBps('0.5')).toBe(50);
    expect(percentToBps('0')).toBe(0);
    expect(percentToBps('100')).toBe(10000);
    expect(percentToBps(28)).toBe(2800);
  });

  it('rejects invalid, negative, or over-100% tax rates', () => {
    expect(percentToBps('')).toBeNull();
    expect(percentToBps('-5')).toBeNull();
    expect(percentToBps('100.01')).toBeNull();
    expect(percentToBps('150')).toBeNull();
    expect(percentToBps('abc')).toBeNull();
    expect(percentToBps('18.999')).toBeNull(); // More than 2 decimal places
  });

  it('formats integer basis points back to percentage strings', () => {
    expect(bpsToPercent(1800)).toBe('18');
    expect(bpsToPercent(1800, true)).toBe('18%');
    expect(bpsToPercent(525)).toBe('5.25');
    expect(bpsToPercent(525, true)).toBe('5.25%');
    expect(bpsToPercent(0, true)).toBe('0%');
    expect(bpsToPercent(2800, true)).toBe('28%');
  });
});

describe('Tax form validation', () => {
  it('rejects empty name and out-of-range rates', () => {
    const res = validateTaxForm({
      name: '',
      ratePercent: '150',
      scope: 'GLOBAL',
      productId: '',
      effectiveFrom: '',
      effectiveTo: '',
      active: true,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.name).toBe('Tax rule name is required.');
    expect(res.errors.ratePercent).toBeDefined();
  });

  it('requires productId when scope is PRODUCT', () => {
    const res = validateTaxForm({
      name: 'Custom Product Tax',
      ratePercent: '12',
      scope: 'PRODUCT',
      productId: '',
      effectiveFrom: '',
      effectiveTo: '',
      active: true,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.productId).toBe('Product selection is required for product-specific tax rules.');
  });

  it('rejects effective end dates preceding start dates', () => {
    const res = validateTaxForm({
      name: 'Fiscal Surcharge',
      ratePercent: '5',
      scope: 'GLOBAL',
      productId: '',
      effectiveFrom: '2026-11-01',
      effectiveTo: '2026-10-01',
      active: true,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.effectiveTo).toBe('Effective end date cannot precede start date.');
  });

  it('validates and sanitizes valid tax configuration into integer basis points', () => {
    const res = validateTaxForm({
      name: 'GST 18%',
      ratePercent: '18.00',
      scope: 'GLOBAL',
      productId: '',
      effectiveFrom: '2026-10-31',
      effectiveTo: '2027-10-31',
      active: true,
    });

    expect(res.isValid).toBe(true);
    expect(res.sanitized).toEqual({
      name: 'GST 18%',
      rate_bps: 1800,
      scope: 'GLOBAL',
      product_id: null,
      effective_from: '2026-10-31',
      effective_to: '2027-10-31',
      active: true,
    });
  });
});

describe('TaxesPage UI and API states', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton initially', () => {
    vi.spyOn(taxService, 'listTaxes').mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <TaxesPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading tax rules...' })).toBeInTheDocument();
  });

  it('renders endpoint unavailable banner when /api/taxes returns 404', async () => {
    vi.spyOn(taxService, 'listTaxes').mockRejectedValue(
      new ApiError(404, 'HTTP_404', 'Endpoint unavailable'),
    );

    render(
      <MemoryRouter>
        <TaxesPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Tax rules endpoint not mounted'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Taxes cannot be retrieved until the backend endpoint \/api\/taxes is available/),
    ).toBeInTheDocument();
  });

  it('renders tax table with rates, basis points, scope, and status badge', async () => {
    vi.spyOn(taxService, 'listTaxes').mockResolvedValue({
      items: [mockGlobalTax, mockProductTax],
      total: 2,
      page: 1,
      page_size: 20,
      has_next: false,
    });

    render(
      <MemoryRouter>
        <TaxesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('GST 18%')).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
    expect(screen.getByText('(1800 bps)')).toBeInTheDocument();
    expect(screen.getByText('All Products (Global)', { selector: 'td span' })).toBeInTheDocument();
    expect(screen.getByText('Active', { selector: '.badge' })).toBeInTheDocument();

    expect(screen.getByText('Hardware Luxury Tax')).toBeInTheDocument();
    expect(screen.getByText('28%')).toBeInTheDocument();
    expect(screen.getByText('(2800 bps)')).toBeInTheDocument();
    expect(screen.getByText('Product: Helpdesk Terminal')).toBeInTheDocument();
  });

  it('opens tax creation modal, selects PRODUCT scope, and submits validated payload to taxService', async () => {
    const user = userEvent.setup();
    vi.spyOn(taxService, 'listTaxes').mockResolvedValue({
      items: [mockGlobalTax],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });
    vi.spyOn(productService, 'listProducts').mockResolvedValue({
      items: [
        {
          id: 'prod-terminal',
          name: 'Helpdesk Terminal',
          type: 'HARDWARE',
          sales_price_minor: 2500000,
          cost_price_minor: 1800000,
          currency: 'INR',
          active: true,
          created_at: '2026-10-31',
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      has_next: false,
    });
    const createSpy = vi.spyOn(taxService, 'createTax').mockResolvedValue(mockProductTax);

    render(
      <MemoryRouter>
        <TaxesPage />
      </MemoryRouter>,
    );

    const newBtn = await screen.findByRole('button', { name: '+ New tax rule' });
    await user.click(newBtn);

    expect(screen.getByRole('dialog', { name: 'Create new tax rule' })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. GST 18% or VAT Standard');
    const rateInput = screen.getByPlaceholderText('18.00');

    await user.type(nameInput, 'Hardware Tax');
    await user.clear(rateInput);
    await user.type(rateInput, '28.00');

    // Switch scope to PRODUCT
    const scopeSelect = screen.getByLabelText('Tax scope *');
    await user.selectOptions(scopeSelect, 'PRODUCT');

    // Select the target product
    const productSelect = await screen.findByLabelText('Target product *');
    await user.selectOptions(productSelect, 'prod-terminal');

    const submitBtn = screen.getByRole('button', { name: 'Create tax rule' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Hardware Tax',
          rate_bps: 2800,
          scope: 'PRODUCT',
          product_id: 'prod-terminal',
          active: true,
        }),
      );
    });
  });

  it('triggers activation toggle and refreshes list', async () => {
    const user = userEvent.setup();
    vi.spyOn(taxService, 'listTaxes').mockResolvedValue({
      items: [mockGlobalTax],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });
    const toggleSpy = vi.spyOn(taxService, 'toggleActive').mockResolvedValue({
      ...mockGlobalTax,
      active: false,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <TaxesPage />
      </MemoryRouter>,
    );

    const deactBtn = await screen.findByRole('button', { name: 'Deactivate' });
    await user.click(deactBtn);

    await waitFor(() => {
      expect(toggleSpy).toHaveBeenCalledWith('tax-gst-18', false);
    });
  });
});
