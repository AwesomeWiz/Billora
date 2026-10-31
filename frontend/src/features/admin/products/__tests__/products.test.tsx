import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../../lib/api/client';
import { productService } from '../services/productService';
import {
  rupeesToPaise,
  paiseToRupees,
  rupeeDeltaToPaise,
  calculateResolvedPrice,
  type Product,
  type ProductVariant,
} from '../types';
import { validateProductForm } from '../components/ProductFormModal';
import { ProductsPage } from '../pages/ProductsPage';
import { VariantManagerModal } from '../components/VariantManagerModal';

const mockHelpdeskPro: Product = {
  id: 'prod-helpdesk',
  name: 'Helpdesk Pro',
  type: 'SOFTWARE',
  sales_price_minor: 150000, // ₹1,500.00
  cost_price_minor: 80000, // ₹800.00
  currency: 'INR',
  notes: 'Core ticketing software',
  active: true,
  variant_count: 1,
  created_at: '2026-10-31T00:00:00Z',
};

const mockOdooVariant: ProductVariant = {
  id: 'var-odoo',
  product_id: 'prod-helpdesk',
  attribute_name: 'brand',
  attribute_value: 'Odoo',
  price_delta_minor: 56000, // +₹560.00
  active: true,
  created_at: '2026-10-31T00:00:00Z',
};

describe('Products & Variants: Unit calculations and conversions', () => {
  it('converts rupee strings to integer paise without floating point issues', () => {
    expect(rupeesToPaise('1500')).toBe(150000);
    expect(rupeesToPaise('1500.00')).toBe(150000);
    expect(rupeesToPaise('1500.50')).toBe(150050);
    expect(rupeesToPaise('0.01')).toBe(1);
    expect(rupeesToPaise('0')).toBe(0);
    expect(rupeesToPaise(1500)).toBe(150000);

    // Invalid inputs
    expect(rupeesToPaise('')).toBeNull();
    expect(rupeesToPaise('-100')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
    expect(rupeesToPaise('10.999')).toBeNull(); // More than 2 decimal places
  });

  it('converts signed rupee deltas to integer paise', () => {
    expect(rupeeDeltaToPaise('+560')).toBe(56000);
    expect(rupeeDeltaToPaise('+560.00')).toBe(56000);
    expect(rupeeDeltaToPaise('560')).toBe(56000);
    expect(rupeeDeltaToPaise('-200.50')).toBe(-20050);
    expect(rupeeDeltaToPaise('+0.00')).toBe(0);
    expect(rupeeDeltaToPaise('invalid')).toBeNull();
  });

  it('formats integer paise back to rupees', () => {
    expect(paiseToRupees(150000)).toBe('1500.00');
    expect(paiseToRupees(56000)).toBe('560.00');
    expect(paiseToRupees(0)).toBe('0.00');
    expect(paiseToRupees(1)).toBe('0.01');
  });

  it('calculates resolved variant unit prices matching the Helpdesk Pro + Odoo spec example', () => {
    // Spec example: Base ₹1,500 (150000 paise) + Odoo brand variant +₹560 (56000 paise) = ₹2,060 (206000 paise)
    const basePrice = 150000;
    const variantAdjustment = 56000;
    const resolvedPrice = calculateResolvedPrice(basePrice, variantAdjustment);

    expect(resolvedPrice).toBe(206000);

    // Negative adjustment
    expect(calculateResolvedPrice(150000, -30000)).toBe(120000);

    // Price cannot resolve below 0
    expect(calculateResolvedPrice(150000, -200000)).toBe(0);
  });
});

describe('Product form validation', () => {
  it('validates required fields and non-negative pricing', () => {
    const invalidEmpty = validateProductForm({
      name: '',
      type: 'SOFTWARE',
      salesPriceRupees: '',
      costPriceRupees: '',
      notes: '',
      active: true,
    });

    expect(invalidEmpty.isValid).toBe(false);
    expect(invalidEmpty.errors.name).toBe('Product name is required.');
    expect(invalidEmpty.errors.salesPrice).toBeDefined();

    const validForm = validateProductForm({
      name: 'Helpdesk Pro',
      type: 'SOFTWARE',
      salesPriceRupees: '1500.00',
      costPriceRupees: '800.00',
      notes: 'Customer support suite',
      active: true,
    });

    expect(validForm.isValid).toBe(true);
    expect(validForm.sanitized).toEqual({
      name: 'Helpdesk Pro',
      type: 'SOFTWARE',
      sales_price_minor: 150000,
      cost_price_minor: 80000,
      notes: 'Customer support suite',
      active: true,
    });
  });
});

describe('ProductsPage UI & API states', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    vi.spyOn(productService, 'listProducts').mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading products...' })).toBeInTheDocument();
  });

  it('renders endpoint unavailable notice when catalog API is not mounted (404)', async () => {
    vi.spyOn(productService, 'listProducts').mockRejectedValue(
      new ApiError(404, 'HTTP_404', 'The requested resource or API endpoint is unavailable.'),
    );

    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Catalog backend endpoint not mounted'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Products cannot be retrieved until the backend endpoint \/api\/products is active/),
    ).toBeInTheDocument();
  });

  it('renders product table with correct prices and variant counts when API returns products', async () => {
    vi.spyOn(productService, 'listProducts').mockResolvedValue({
      items: [mockHelpdeskPro],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });

    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Helpdesk Pro')).toBeInTheDocument();
    expect(screen.getByText('₹1,500.00')).toBeInTheDocument();
    expect(screen.getByText('₹800.00')).toBeInTheDocument();
    expect(screen.getByText('1 variant')).toBeInTheDocument();
    expect(screen.getByText('Active', { selector: '.badge' })).toBeInTheDocument();
  });

  it('opens create product modal and validates form on submission', async () => {
    const user = userEvent.setup();
    vi.spyOn(productService, 'listProducts').mockResolvedValue({
      items: [mockHelpdeskPro],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });
    const createSpy = vi.spyOn(productService, 'createProduct').mockResolvedValue(mockHelpdeskPro);

    render(
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>,
    );

    const newBtn = await screen.findByRole('button', { name: '+ New product' });
    await user.click(newBtn);

    expect(screen.getByRole('dialog', { name: 'Create new product' })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Create product' });
    await user.click(submitBtn);

    // Validation error shown, API not called
    expect(screen.getByText('Product name is required.')).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();

    // Fill valid data
    const nameInput = screen.getByPlaceholderText('e.g. Helpdesk Pro');
    const priceInput = screen.getByPlaceholderText('1500.00');

    await user.type(nameInput, 'SLA Addon');
    await user.type(priceInput, '500.00');

    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'SLA Addon',
        type: 'SOFTWARE',
        sales_price_minor: 50000,
        cost_price_minor: 0,
        active: true,
      });
    });
  });
});

describe('VariantManagerModal UI & calculations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays Helpdesk Pro base price, lists Odoo variant, and displays resolved price of ₹2,060.00', async () => {
    vi.spyOn(productService, 'listVariants').mockResolvedValue([mockOdooVariant]);

    render(
      <VariantManagerModal
        isOpen={true}
        product={mockHelpdeskPro}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Variants: Helpdesk Pro')).toBeInTheDocument();
    expect(screen.getByText(/150000 paise/)).toBeInTheDocument();

    // Verifies the Odoo variant row
    expect(await screen.findByText('Odoo')).toBeInTheDocument();
    expect(screen.getByText('+₹560.00')).toBeInTheDocument();
    expect(screen.getByText('₹2,060.00', { selector: 'td span' })).toBeInTheDocument();

    // Verifies the example formula callout
    expect(screen.getByText(/₹1,500.00 \(150,000 paise\) \+ ₹560.00 \(56,000 paise\) =/)).toBeInTheDocument();
  });

  it('allows adding a new variant with live calculation preview', async () => {
    const user = userEvent.setup();
    vi.spyOn(productService, 'listVariants').mockResolvedValue([]);
    const createVariantSpy = vi.spyOn(productService, 'createVariant').mockResolvedValue(mockOdooVariant);

    render(
      <VariantManagerModal
        isOpen={true}
        product={mockHelpdeskPro}
        onClose={vi.fn()}
      />,
    );

    const addBtn = await screen.findByRole('button', { name: '+ Add variant' });
    await user.click(addBtn);

    const attrInput = screen.getByPlaceholderText('e.g. brand');
    const valInput = screen.getByPlaceholderText('e.g. Odoo');
    const adjInput = screen.getByPlaceholderText('+560.00 or -50.00');

    await user.type(attrInput, 'brand');
    await user.type(valInput, 'Odoo');
    await user.clear(adjInput);
    await user.type(adjInput, '+560.00');

    // Check live preview has calculated ₹2,060.00
    expect(screen.getByTestId('live-resolved-preview')).toHaveTextContent('₹2,060.00');

    const saveBtn = screen.getByRole('button', { name: 'Add variant' });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(createVariantSpy).toHaveBeenCalledWith('prod-helpdesk', {
        attribute_name: 'brand',
        attribute_value: 'Odoo',
        price_delta_minor: 56000,
        active: true,
      });
    });
  });
});
