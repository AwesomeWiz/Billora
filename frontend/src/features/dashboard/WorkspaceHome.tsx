import { ArrowUpRight, Check, Layers3, Link2, Receipt, ShieldCheck } from 'lucide-react';
import { MetricCard } from '../../components/data';
import { EmptyState, PageHeader } from '../../components/ui';

export function WorkspaceHome() {
  return <>
    <PageHeader title="Overview" description="A clearer picture of your subscription business." />
    <div className="notice notice-info connection-banner"><Link2 size={18} aria-hidden="true" /><div><strong>Your workspace foundation is ready</strong><p>Financial reporting will appear here once the billing and reporting APIs are integrated. No financial records are loaded.</p></div></div>
    <div className="metric-grid">
      <MetricCard label="Active subscriptions" description="Current active contracts · Not connected" />
      <MetricCard label="Collected revenue" description="Recorded payments · Not connected" />
      <MetricCard label="Outstanding balance" description="Collectible invoice balances · Not connected" />
      <MetricCard label="Overdue invoices" description="Past due and unpaid · Not connected" />
    </div>
    <div className="overview-grid">
      <section className="card"><div className="card-header"><div><h2>Financial overview</h2><p className="muted">Actual billings and collected payments</p></div><span className="subtle-label">Awaiting integration</span></div>
        <EmptyState title="Your financial picture starts here" description="Server-confirmed revenue and balances will be shown when reporting is connected." />
      </section>
      <section className="card workflow-card"><div className="card-header"><div><h2>A connected billing workflow</h2><p className="muted">The path from agreement to collection</p></div></div>
        <ol className="workflow-list">
          <li><span className="workflow-icon"><Layers3 size={18} aria-hidden="true" /></span><div><h3>Manage subscriptions</h3><p>Plans, lifecycle, and renewal dates.</p></div></li>
          <li><span className="workflow-icon"><Receipt size={18} aria-hidden="true" /></span><div><h3>Invoice with confidence</h3><p>Itemized snapshots and clear balances.</p></div></li>
          <li><span className="workflow-icon"><ShieldCheck size={18} aria-hidden="true" /></span><div><h3>Reconcile payments</h3><p>Record payments against actual invoices.</p></div></li>
        </ol><p className="workflow-footer">Operational modules are the next implementation milestone.<ArrowUpRight size={16} aria-hidden="true" /></p>
      </section>
    </div>
    <section className="foundation-note"><span><Check size={16} aria-hidden="true" /> Workspace foundation</span><p>Secure sessions, role-aware navigation, and a shared design system.</p></section>
  </>;
}
