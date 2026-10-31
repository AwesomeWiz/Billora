import React from 'react';
import type { RevenueLeakFinding, RevenueLeakSummary } from '../types';

interface LeakSummaryCardsProps {
  findings: RevenueLeakFinding[];
  summary: RevenueLeakSummary | null;
}

export const LeakSummaryCards: React.FC<LeakSummaryCardsProps> = ({ findings, summary }) => {
  // Counts derived safely from loaded findings
  const missedBillingDerivedCount = findings.filter((f) => f.rule === 'BILLING_MISSED').length;
  const overdueInvoiceDerivedCount = findings.filter((f) => f.rule === 'INVOICE_OVERDUE').length;
  const blockedConfigDerivedCount = findings.filter((f) => f.rule === 'BILLING_BLOCKED').length;

  // Use backend-provided summary aggregates if available; otherwise show safely derived finding counts
  const missedCount = summary?.missed_billing_count !== undefined
    ? summary.missed_billing_count
    : missedBillingDerivedCount;

  const overdueCount = summary?.overdue_invoice_count !== undefined
    ? summary.overdue_invoice_count
    : overdueInvoiceDerivedCount;

  // Potential value at risk: Only display when explicitly supplied by the backend
  const hasAuthoritativeRiskAmount = summary?.total_value_at_risk_minor !== undefined && summary.total_value_at_risk_minor !== null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Missed Billing Events */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Missed Billing Cycles
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 font-mono">
            {missedCount}
          </span>
          <span className="text-xs text-gray-500">
            {summary?.missed_billing_count !== undefined ? '(Server aggregate)' : '(Current findings)'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Active contracts due for invoicing without a processed billing cycle.
        </p>
      </div>

      {/* Overdue Invoices */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Overdue Invoices
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 font-mono">
            {overdueCount}
          </span>
          <span className="text-xs text-gray-500">
            {summary?.overdue_invoice_count !== undefined ? '(Server aggregate)' : '(Current findings)'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Confirmed collectible invoices with an unpaid balance past their due date.
        </p>
      </div>

      {/* Blocked Subscriptions */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Blocked Configurations
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 font-mono">
            {blockedConfigDerivedCount}
          </span>
          <span className="text-xs text-gray-500">(Active findings)</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Subscriptions needing pricing or plan assignment to bill successfully.
        </p>
      </div>

      {/* Estimated Value at Risk (Only when supplied by backend) */}
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
          Estimated Value at Risk
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          {hasAuthoritativeRiskAmount ? (
            <span className="text-2xl font-bold text-amber-700 font-mono">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: summary?.currency || 'INR',
                minimumFractionDigits: 2,
              }).format((summary!.total_value_at_risk_minor || 0) / 100)}
            </span>
          ) : (
            <span className="text-sm font-medium text-gray-400 italic">
              Awaiting backend calculation
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Authoritative risk total calculated and verified server-side.
        </p>
      </div>
    </div>
  );
};

