import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button, Input } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import type { SubscriptionDetail, SubscriptionPlan } from './detail-api';
import { permittedTransitions, transitionDefinitions, transitionSubscription, type TransitionAction } from './transitions';

export function LifecycleActions({ subscription, plan, onConfirmed, onRefresh }: {
  subscription: SubscriptionDetail; plan: SubscriptionPlan; onConfirmed: (value: SubscriptionDetail) => void; onRefresh: () => void;
}) {
  const { state } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const [selected, setSelected] = useState<TransitionAction | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (selected) dialog.current?.showModal(); else dialog.current?.close(); }, [selected]);
  const role = state.user?.role;
  const actions = role ? permittedTransitions(subscription, plan, role) : [];
  if (!role || role === 'CUSTOMER') return null;

  function dismiss() { if (!submitting.current) setSelected(null); }
  function refresh() { dismiss(); onRefresh(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitting.current || needsRefresh || !role || !permittedTransitions(subscription, plan, role).includes(selected)) return;
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim();
    if (!reason) { setError('Enter a reason for this change.'); return; }
    submitting.current = true; setPending(true); setError(null);
    try {
      const result = await transitionSubscription(subscription.id, selected, reason);
      if (mounted.current) { setSelected(null); onConfirmed(result); }
    } catch (err) {
      if (mounted.current) { setError(errorMessage(err)); setNeedsRefresh(true); }
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return <div className="record-padding">
    <h3>Lifecycle actions</h3>
    {actions.length === 0 ? <p className="muted">No lifecycle actions are permitted by the current state and available plan policy.</p> : <>
      <p className="muted">Changes wait for backend confirmation. Missing request contracts remain unavailable.</p>
      <div className="record-inline" style={{ marginTop: 16 }}>
        {actions.map(action => <Button key={action} variant={action === 'CLOSE' ? 'danger' : action === 'ACTIVATE' ? 'primary' : 'secondary'}
          disabled={!transitionDefinitions[action].confirmedContract || !api.hasCsrfToken() || pending || needsRefresh}
          aria-describedby="subscription-transition-availability" onClick={() => { setError(null); setSelected(action); }}>
          {transitionDefinitions[action].label}{!transitionDefinitions[action].confirmedContract ? ' (unavailable)' : ''}
        </Button>)}
      </div>
    </>}
    <p className="field-hint" id="subscription-transition-availability" style={{ marginTop: 12 }}>
      {needsRefresh ? 'Refresh the subscription before another attempt.' : !api.hasCsrfToken() ? 'A secure CSRF token is required before submitting a change.' : 'Pause, resume, renew, and close request contracts still need backend confirmation.'}
    </p>
    {needsRefresh && !selected && <Button variant="secondary" onClick={onRefresh}>Refresh subscription</Button>}
    <dialog ref={dialog} className="record-dialog" aria-labelledby="subscription-transition-title" aria-describedby="subscription-transition-consequence"
      onCancel={event => { event.preventDefault(); dismiss(); }}>
      {selected && <>
        <h2 id="subscription-transition-title">{transitionDefinitions[selected].label} {subscription.number}?</h2>
        <p id="subscription-transition-consequence" className="muted">{transitionDefinitions[selected].consequence}</p>
        <form onSubmit={submit} aria-label="Confirm subscription change">
          <Input label="Reason" name="reason" required maxLength={500} disabled={pending || needsRefresh} autoFocus />
          {error && <div className="notice notice-error" role="alert">{error}{needsRefresh && <p>No completion is assumed. Refresh to reconcile the current server state.</p>}</div>}
          <div className="record-inline"><Button variant="secondary" disabled={pending} onClick={dismiss}>Cancel</Button>
            {needsRefresh ? <Button variant="secondary" onClick={refresh}>Refresh subscription</Button>
              : <Button type="submit" variant={selected === 'CLOSE' ? 'danger' : 'primary'} loading={pending} disabled={!api.hasCsrfToken()}>Confirm {transitionDefinitions[selected].label.toLowerCase()}</Button>}
          </div>
        </form>
      </>}
    </dialog>
  </div>;
}
