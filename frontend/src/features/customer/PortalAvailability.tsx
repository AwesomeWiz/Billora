import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/ui';

/** No request is safe until the backend enforces ownership on both reads. */
export function PortalAvailability({ resource }: { resource: 'subscriptions' | 'invoices' }) {
  return <section className="card" aria-label={`Your ${resource} availability`}>
    <EmptyState title={`Your ${resource} are not connected yet`}
      description={`The billing service has not yet provided verified access to your account's ${resource}. No records or balances have been loaded. This does not mean your account has none.`}
      action={<Link className="button button-secondary" to="/portal/account">View your account</Link>} />
  </section>;
}
