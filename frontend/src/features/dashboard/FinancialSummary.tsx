import { MetricCard } from '../../components/data';
import { Button, EmptyState, ErrorState, Money } from '../../components/ui';
import { ApiError, errorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useRecordResource } from '../customer/records';
import { summaryApi } from './summary-api';
import './dashboard.css';

export function ReportError({ error, name, retry }: { error: unknown; name: string; retry: () => void }) {
  const status = error instanceof ApiError ? error.status : 0;
  return <ErrorState title={status === 403 ? `${name} access denied` : status === 404 ? `${name} unavailable` : `Unable to load ${name.toLowerCase()}`}
    description={status === 404 ? 'The reporting endpoint is unavailable or has not been connected. No financial results are assumed.' : errorMessage(error)}
    permission={status === 403} onRetry={status === 403 ? undefined : retry} />;
}

export function FinancialSummary() {
  const { resource, reload } = useRecordResource('financial-summary', summaryApi.get);
  const data = resource.status === 'ready' ? resource.data : null;
  const loading = resource.status === 'loading';
  const count = (value: number) => new Intl.NumberFormat('en-IN').format(value);
  const inactive = data && [data.active_subscriptions, data.collected_minor, data.confirmed_invoiced_minor, data.outstanding_minor, data.overdue_count, data.overdue_minor].every(value => value === 0);
  return <section className="financial-summary" aria-label="Financial summary">
    <div className="finance-section-heading"><div><h2>Financial summary</h2><p className="muted">Actual billings and collected payments</p></div>
      <Button variant="secondary" disabled={loading} onClick={reload}>Refresh financial summary</Button>
    </div>
    <p className="finance-report-period">{data ? <>Server report period: <time dateTime={data.range.from}>{formatDate(data.range.from)}</time> – <time dateTime={data.range.to}>{formatDate(data.range.to)}</time> · {data.currency}</> : loading ? 'Loading the service’s reporting period…' : 'Reporting period unavailable.'}</p>
    {resource.status === 'error' && <ReportError error={resource.error} name="Financial summary" retry={reload} />}
    <div className="metric-grid finance-metrics" aria-busy={loading}>
      <MetricCard label="Active subscriptions" value={data ? count(data.active_subscriptions) : undefined} loading={loading} description="Active contracts under the service’s reporting rules" />
      <MetricCard label="Collected revenue" value={data ? <Money amountMinor={data.collected_minor} currency={data.currency} /> : undefined} loading={loading} description="Recorded payments in the reported period" />
      <MetricCard label="Confirmed invoiced revenue" value={data ? <Money amountMinor={data.confirmed_invoiced_minor} currency={data.currency} /> : undefined} loading={loading} description="Confirmed billings in the reported period; distinct from cash collected" />
      <MetricCard label="Outstanding receivables" value={data ? <Money amountMinor={data.outstanding_minor} currency={data.currency} /> : undefined} loading={loading} description="Collectible balances in the service’s report scope" />
      <MetricCard label="Overdue invoice count" value={data ? count(data.overdue_count) : undefined} loading={loading} description="Overdue invoices identified by the service" />
      <MetricCard label="Overdue invoice amount" value={data ? <Money amountMinor={data.overdue_minor} currency={data.currency} /> : undefined} loading={loading} description="Outstanding overdue balances reported by the service" />
    </div>
    {inactive && <EmptyState title="No financial activity in this report" description="The service returned zero for all six metrics. Browse the catalog, customers, subscriptions, or invoices to continue." />}
    <p className="finance-scope-note">Collected payments, confirmed billings and outstanding balances are separate measures. Totals come from the reporting service, never from a page of invoices. No trend or forecast is inferred.</p>
  </section>;
}
