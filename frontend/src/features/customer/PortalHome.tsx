import { Layers3, Receipt, ShieldCheck } from 'lucide-react';
import { MetricCard } from '../../components/data';
import { EmptyState, PageHeader } from '../../components/ui';
import { useAuth } from '../auth/AuthProvider';

export function PortalHome() {
  return <>
    <PageHeader title="Your billing, in one place" description="Stay close to your subscriptions, invoices, and next renewal." />
    <div className="notice notice-info"><strong>Your customer workspace is ready</strong><p>Subscription and invoice views are awaiting integration. Account data will only come from your authorized billing account.</p></div>
    <div className="metric-grid portal-metrics"><MetricCard label="Your subscriptions" description="Current contracts · Not connected" /><MetricCard label="Next renewal" description="Upcoming billing date · Not connected" /><MetricCard label="Outstanding balance" description="Your invoice balances · Not connected" /></div>
    <section className="card"><div className="card-header"><h2>Your recent invoices</h2><Receipt size={18} aria-hidden="true" /></div><EmptyState title="Invoices are not connected yet" description="Your invoices and payment history will appear here when the billing service is integrated." /></section>
    <div className="portal-note"><Layers3 size={18} aria-hidden="true" /><p>A clear view of every cycle, from subscription to settlement.</p></div>
  </>;
}

export function AccountPage() {
  const { state } = useAuth();
  if (!state.user) return null;
  return <>
    <PageHeader title="Your account" description="Your verified Billora session details." />
    <section className="card account-card"><div className="card-header"><h2>Account information</h2><ShieldCheck size={18} aria-hidden="true" /></div>
      <dl className="detail-list"><div><dt>Email address</dt><dd>{state.user.email}</dd></div><div><dt>Access</dt><dd>Customer</dd></div><div><dt>Billing account</dt><dd>{state.user.account_id}</dd></div></dl>
      <p className="account-note">Profile editing and password settings will be available after account-management integration.</p>
    </section>
  </>;
}
