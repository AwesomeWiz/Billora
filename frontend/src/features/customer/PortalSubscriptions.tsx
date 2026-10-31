import { Link } from 'react-router-dom';
import { Button, PageHeader } from '../../components/ui';
import { PortalAvailability } from './PortalAvailability';

export function PortalSubscriptions({ detail = false }: { detail?: boolean }) {
  return <>
    <PageHeader title={detail ? 'Your subscription' : 'My subscriptions'}
      description="Your plans, renewal dates and billing commitments."
      action={detail ? <Link className="button button-secondary" to="/portal/subscriptions">Back to my subscriptions</Link> : undefined} />
    <PortalAvailability resource="subscriptions" />
    <section className="card account-card" aria-label="Subscription self-service">
      <div className="card-header"><h2>Manage your subscription</h2></div>
      <p id="portal-subscription-policy" className="account-note">Pause, close and renew are unavailable until the service verifies ownership, plan eligibility and permission for your account. No subscription changes can be submitted here.</p>
      <div className="record-inline">
        {['Pause', 'Close', 'Renew'].map(action => <Button key={action} variant="secondary" disabled aria-describedby="portal-subscription-policy">{action} subscription</Button>)}
      </div>
    </section>
  </>;
}
