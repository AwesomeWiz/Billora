import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../../lib/api/client';
import { planService } from '../services/planService';
import { validatePlanForm } from '../components/PlanFormModal';
import { PlanBillingSummary } from '../components/PlanBillingSummary';
import { PlansPage } from '../pages/PlansPage';
import type { Plan } from '../types';

const mockEnterprisePlan: Plan = {
  id: 'plan-enterprise-monthly',
  name: 'Enterprise Monthly',
  base_fee_minor: 150000, // ₹1,500.00
  bill_plan_base_fee: true,
  billing_interval: 'MONTHLY',
  min_quantity: 5,
  available_from: '2026-10-31',
  available_to: '2027-10-31',
  currency: 'INR',
  auto_close: true,
  can_close_early: true,
  can_pause: true,
  can_renew: true,
  active: true,
};

describe('Plan form validation and lifecycle rules', () => {
  it('rejects empty name and non-positive quantity', () => {
    const res = validatePlanForm({
      name: '',
      baseFeeRupees: '1500.00',
      currency: 'INR',
      billPlanBaseFee: true,
      billingInterval: 'MONTHLY',
      minQuantity: '0',
      availableFrom: '2026-10-31',
      availableTo: '',
      lifecycle: {
        auto_close: true,
        can_close_early: false,
        can_pause: false,
        can_renew: true,
      },
      active: true,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.name).toBe('Plan name is required.');
    expect(res.errors.minQuantity).toBe('Minimum quantity must be an integer of at least 1.');
  });

  it('rejects end dates preceding start dates', () => {
    const res = validatePlanForm({
      name: 'Standard Weekly',
      baseFeeRupees: '500.00',
      currency: 'INR',
      billPlanBaseFee: false,
      billingInterval: 'WEEKLY',
      minQuantity: '1',
      availableFrom: '2026-11-01',
      availableTo: '2026-10-01',
      lifecycle: {
        auto_close: true,
        can_close_early: true,
        can_pause: true,
        can_renew: true,
      },
      active: true,
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.availableTo).toBe('End date cannot precede the start date.');
  });

  it('validates and sanitizes valid plan configuration into minor units', () => {
    const res = validatePlanForm({
      name: 'Enterprise Monthly',
      baseFeeRupees: '1500.00',
      currency: 'INR',
      billPlanBaseFee: true,
      billingInterval: 'MONTHLY',
      minQuantity: '5',
      availableFrom: '2026-10-31',
      availableTo: '2027-10-31',
      lifecycle: {
        auto_close: true,
        can_close_early: true,
        can_pause: true,
        can_renew: true,
      },
      active: true,
    });

    expect(res.isValid).toBe(true);
    expect(res.sanitized).toEqual({
      name: 'Enterprise Monthly',
      base_fee_minor: 150000,
      bill_plan_base_fee: true,
      billing_interval: 'MONTHLY',
      min_quantity: 5,
      available_from: '2026-10-31',
      available_to: '2027-10-31',
      currency: 'INR',
      auto_close: true,
      can_close_early: true,
      can_pause: true,
      can_renew: true,
      active: true,
    });
  });
});

describe('PlanBillingSummary preview component', () => {
  it('renders preview disclaimer, base fee, frequency, and explicit billing badge when bill_plan_base_fee is true', () => {
    render(
      <PlanBillingSummary
        name="Enterprise Monthly"
        baseFeeMinor={150000}
        currency="INR"
        billPlanBaseFee={true}
        billingInterval="MONTHLY"
        minQuantity={5}
        availableFrom="2026-10-31"
        availableTo="2027-10-31"
        lifecycle={{
          auto_close: true,
          can_close_early: true,
          can_pause: true,
          can_renew: true,
        }}
      />,
    );

    expect(screen.getByText('Preview — Not saved')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Monthly')).toBeInTheDocument();
    expect(screen.getByText('₹1,500.00')).toBeInTheDocument();
    expect(screen.getByText('Plan Base Fee Will Be Invoiced')).toBeInTheDocument();
    expect(screen.getByText(/5 units minimum/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-close: Enabled/)).toBeInTheDocument();
  });

  it('renders informational notice when bill_plan_base_fee is false', () => {
    render(
      <PlanBillingSummary
        name="Usage Plan"
        baseFeeMinor={0}
        currency="INR"
        billPlanBaseFee={false}
        billingInterval="MONTHLY"
        minQuantity={1}
        availableFrom="2026-10-31"
        lifecycle={{
          auto_close: false,
          can_close_early: true,
          can_pause: false,
          can_renew: true,
        }}
      />,
    );

    expect(screen.getByText('Informational Base Fee Only')).toBeInTheDocument();
    expect(
      screen.getByText(/recurring invoices will charge solely for itemized subscription line items/),
    ).toBeInTheDocument();
  });
});

describe('PlansPage UI and API states', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading skeleton initially', () => {
    vi.spyOn(planService, 'listPlans').mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { name: 'Loading subscription plans...' })).toBeInTheDocument();
  });

  it('renders endpoint unavailable banner when /api/plans returns 404', async () => {
    vi.spyOn(planService, 'listPlans').mockRejectedValue(
      new ApiError(404, 'HTTP_404', 'Endpoint unavailable'),
    );

    render(
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Subscription plans endpoint not mounted'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Plans cannot be retrieved until the backend endpoint \/api\/plans is available/),
    ).toBeInTheDocument();
  });

  it('renders plan table with base fee, interval, min quantity, and policy badges', async () => {
    vi.spyOn(planService, 'listPlans').mockResolvedValue({
      items: [mockEnterprisePlan],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });

    render(
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Enterprise Monthly')).toBeInTheDocument();
    expect(screen.getByText('₹1,500.00')).toBeInTheDocument();
    expect(screen.getByText('Monthly', { selector: 'td span' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Auto-close')).toBeInTheDocument();
    expect(screen.getByText('Active', { selector: '.badge' })).toBeInTheDocument();
  });

  it('opens plan creation modal and submits validated payload to planService', async () => {
    const user = userEvent.setup();
    vi.spyOn(planService, 'listPlans').mockResolvedValue({
      items: [mockEnterprisePlan],
      total: 1,
      page: 1,
      page_size: 20,
      has_next: false,
    });
    const createSpy = vi.spyOn(planService, 'createPlan').mockResolvedValue(mockEnterprisePlan);

    render(
      <MemoryRouter>
        <PlansPage />
      </MemoryRouter>,
    );

    const newBtn = await screen.findByRole('button', { name: '+ New plan' });
    await user.click(newBtn);

    expect(screen.getByRole('dialog', { name: 'Create subscription plan' })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Enterprise Monthly');
    const feeInput = screen.getByPlaceholderText('1500.00');

    await user.type(nameInput, 'Growth Yearly');
    await user.clear(feeInput);
    await user.type(feeInput, '12000.00');

    const submitBtn = screen.getByRole('button', { name: 'Create plan' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Growth Yearly',
          base_fee_minor: 1200000,
          currency: 'INR',
          billing_interval: 'MONTHLY',
          min_quantity: 1,
        }),
      );
    });
  });
});
