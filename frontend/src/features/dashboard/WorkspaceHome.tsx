import { ArrowUpRight, Layers3, Receipt, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui';
import { FinancialSummary } from './FinancialSummary';

export function WorkspaceHome() {
  return <>
    <PageHeader title="Overview" description="A clearer picture of your subscription business."
      action={<Link className="button button-secondary" to="/app/reports">View financial reports</Link>} />
    <FinancialSummary />
    <p className="finance-report-link"><Link to="/app/reports#overdue-invoices">Review overdue invoice report <ArrowUpRight size={14} aria-hidden="true" /></Link></p>
    <section className="card finance-workspace-links" aria-label="Billing workspace">
      <div className="card-header"><div><h2>Continue in your workspace</h2><p className="muted">Inspect the records behind your billing operations.</p></div></div>
      <div className="finance-shortcuts">
        <Link to="/app/subscriptions"><Layers3 size={20} aria-hidden="true" /><span><strong>Subscriptions</strong><small>Contracts, lifecycle and renewal dates</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link to="/app/invoices"><Receipt size={20} aria-hidden="true" /><span><strong>Invoices & payments</strong><small>Invoice snapshots, balances and payment history</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link to="/app/customers"><Users size={20} aria-hidden="true" /><span><strong>Customers</strong><small>Billing accounts and linked records</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  </>;
}
