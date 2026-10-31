import { api, ApiError } from '../../lib/api';
import type { Role } from '../auth/contract';
import { identifier } from '../customer/records';
import { parseSubscriptionDetail, type SubscriptionDetail, type SubscriptionPlan } from './detail-api';
import type { SubscriptionStatus } from './api';

export type TransitionAction = 'ACTIVATE' | 'PAUSE' | 'RESUME' | 'RENEW' | 'CLOSE';
export const transitionDefinitions: Record<TransitionAction, { label: string; confirmedContract: boolean; consequence: string; target: SubscriptionStatus }> = {
  ACTIVATE: { label: 'Activate', confirmedContract: true, target: 'ACTIVE', consequence: 'The server will validate eligibility and initialize the billing schedule. This can make the agreement eligible for recurring billing.' },
  PAUSE: { label: 'Pause', confirmedContract: false, target: 'PAUSED', consequence: 'Pausing changes eligibility for future billing. Previously issued invoices are separate records.' },
  RESUME: { label: 'Resume', confirmedContract: false, target: 'ACTIVE', consequence: 'Resuming changes the billing schedule according to the server’s pause policy.' },
  RENEW: { label: 'Renew', confirmedContract: false, target: 'ACTIVE', consequence: 'Renewal changes the agreement term. The server must define the new expiry and billing dates.' },
  CLOSE: { label: 'Close', confirmedContract: false, target: 'CLOSED', consequence: 'Closing stops eligibility for new billing periods. Existing invoices and balances remain separate records.' },
};

/** UI restriction only; the server always rechecks role, policy, dates and transition legality. */
export function permittedTransitions(subscription: SubscriptionDetail, plan: SubscriptionPlan, role: Role): TransitionAction[] {
  if (!['ADMIN', 'STAFF'].includes(role) || subscription.plan_id !== plan.id) return [];
  if (subscription.status === 'CONFIRMED') return plan.active === true ? ['ACTIVATE'] : [];
  if (subscription.status === 'PAUSED') return plan.can_pause === true && plan.active === true ? ['RESUME'] : [];
  if (subscription.status !== 'ACTIVE') return [];
  const result: TransitionAction[] = [];
  if (plan.can_pause === true) result.push('PAUSE');
  if (plan.can_renew === true) result.push('RENEW');
  if (plan.can_close_early === true) result.push('CLOSE');
  return result;
}

export async function transitionSubscription(id: string, action: TransitionAction, reason: string) {
  if (!transitionDefinitions[action]?.confirmedContract) throw new ApiError(0, 'TRANSITION_CONTRACT_PENDING', 'This transition request contract has not been confirmed yet. No change was submitted.');
  const updated = parseSubscriptionDetail(await api.post<unknown>(`/subscriptions/${identifier(id)}/transition`, { action, reason: reason.trim() }));
  if (updated.id !== id || updated.status !== transitionDefinitions[action].target) {
    throw new ApiError(0, 'TRANSITION_UNVERIFIED', 'The transition result could not be verified. Refresh the subscription before submitting again.');
  }
  return updated;
}
