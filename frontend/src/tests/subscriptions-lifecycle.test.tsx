import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LifecycleActions } from '../features/subscriptions/LifecycleActions';
import { permittedTransitions, transitionSubscription } from '../features/subscriptions/transitions';
import type { SubscriptionDetail, SubscriptionPlan } from '../features/subscriptions/detail-api';
import { api } from '../lib/api';
import type { Role } from '../features/auth/contract';

const identity = vi.hoisted(() => ({ role: 'STAFF' as Role }));
vi.mock('../features/auth/AuthProvider', () => ({ useAuth: () => ({ state: { status: 'authenticated', user: { role: identity.role } } }) }));
const subscription: SubscriptionDetail = { id: 'sub-1', number: 'SUB-000001', account_id: 'account-1', plan_id: 'plan-1', status: 'CONFIRMED', currency: 'INR', next_billing_date: null };
const plan: SubscriptionPlan = { id: 'plan-1', name: 'Test plan', billing_interval: 'MONTHLY', active: true, can_pause: true, can_renew: true, can_close_early: true };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { identity.role = 'STAFF'; api.setCsrfToken('test-csrf'); });

function open(value = subscription, policy = plan) {
  const onConfirmed = vi.fn(); const onRefresh = vi.fn();
  render(<LifecycleActions subscription={value} plan={policy} onConfirmed={onConfirmed} onRefresh={onRefresh} />);
  return { onConfirmed, onRefresh };
}
async function confirmDialog() {
  await userEvent.click(screen.getByRole('button', { name: 'Activate' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAccessibleName('Activate SUB-000001?');
  await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Customer approved');
  return dialog;
}

describe('subscription lifecycle policy and confirmation', () => {
  it.each(['ADMIN', 'STAFF'] as const)('offers activation to %s for a confirmed agreement and active plan', role => {
    expect(permittedTransitions(subscription, plan, role)).toEqual(['ACTIVATE']);
  });
  it('omits every action for customers and disallows cross-plan policy data', () => {
    identity.role = 'CUSTOMER'; open();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(permittedTransitions(subscription, { ...plan, id: 'other-plan' }, 'ADMIN')).toEqual([]);
  });
  it.each(['DRAFT', 'QUOTATION', 'CLOSED'] as const)('offers no unsupported transition from %s', status => {
    expect(permittedTransitions({ ...subscription, status }, plan, 'ADMIN')).toEqual([]);
  });
  it('requires explicit policy booleans and preserves ACTIVE/PAUSED action boundaries', () => {
    expect(permittedTransitions({ ...subscription, status: 'ACTIVE' }, plan, 'STAFF')).toEqual(['PAUSE', 'RENEW', 'CLOSE']);
    expect(permittedTransitions({ ...subscription, status: 'PAUSED' }, plan, 'STAFF')).toEqual(['RESUME']);
    expect(permittedTransitions({ ...subscription, status: 'ACTIVE' }, { ...plan, can_pause: undefined, can_renew: false, can_close_early: false }, 'STAFF')).toEqual([]);
    expect(permittedTransitions(subscription, { ...plan, active: undefined }, 'STAFF')).toEqual([]);
  });
  it('keeps unconfirmed request contracts visibly unavailable without sending a mutation', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    open({ ...subscription, status: 'ACTIVE' });
    for (const label of ['Pause (unavailable)', 'Renew (unavailable)', 'Close (unavailable)']) expect(screen.getByRole('button', { name: label })).toBeDisabled();
    await expect(transitionSubscription('sub-1', 'RENEW', 'Reason')).rejects.toMatchObject({ code: 'TRANSITION_CONTRACT_PENDING' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps Resume unavailable while its payload contract is pending', () => {
    open({ ...subscription, status: 'PAUSED' });
    expect(screen.getByRole('button', { name: 'Resume (unavailable)' })).toBeDisabled();
  });
  it('disables submission without a secure CSRF token', () => {
    api.setCsrfToken(null); open();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeDisabled();
    expect(screen.getByText(/secure CSRF token is required/)).toBeInTheDocument();
  });
  it('requires confirmation and waits for the server before reporting completion', async () => {
    let complete!: (value: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const { onConfirmed } = open();
    const dialog = await confirmDialog();
    expect(fetcher).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm activate' }));
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Confirm activate' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [path, options] = fetcher.mock.calls[0];
    expect(path).toBe('/api/subscriptions/sub-1/transition');
    expect(options?.credentials).toBe('include');
    expect((options?.headers as Headers).get('X-CSRF-Token')).toBe('test-csrf');
    expect(JSON.parse(String(options?.body))).toEqual({ action: 'ACTIVATE', reason: 'Customer approved' });
    await act(async () => complete(json({ ...subscription, status: 'ACTIVE', next_billing_date: '2026-11-01' })));
    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' })));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it.each([403, 409, 422, 500])('never completes a rejected HTTP %s transition and requires reconciliation', async status => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ code: 'INVALID_STATE_TRANSITION', message: 'Transition rejected' }, status));
    const { onConfirmed, onRefresh } = open();
    const dialog = await confirmDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm activate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No completion is assumed');
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Confirm activate' })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refresh subscription' }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
  it('does not treat malformed or mismatched mutation responses as completion', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ ...subscription, id: 'wrong-id', status: 'ACTIVE' }));
    const { onConfirmed } = open();
    const dialog = await confirmDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm activate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
    expect(onConfirmed).not.toHaveBeenCalled();
  });
  it('cancels without sending an API mutation', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch'); open();
    const dialog = await confirmDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
