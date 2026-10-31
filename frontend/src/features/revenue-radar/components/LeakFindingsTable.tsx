import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui';
import type { StatusTone } from '../../../components/ui/StatusBadge';
import { LEAK_RULE_LABELS } from '../types';
import type { RevenueLeakFinding, LeakSeverity } from '../types';

interface LeakFindingsTableProps {
  findings: RevenueLeakFinding[];
}

function getSeverityBadge(severity: LeakSeverity): { tone: StatusTone; label: string; badgeClasses: string } {
  switch (severity) {
    case 'HIGH':
      return { tone: 'danger', label: 'High', badgeClasses: 'bg-red-50 text-red-700 border-red-200' };
    case 'MEDIUM':
      return { tone: 'warning', label: 'Medium', badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'LOW':
      return { tone: 'neutral', label: 'Low', badgeClasses: 'bg-gray-100 text-gray-700 border-gray-200' };
    default:
      return { tone: 'neutral', label: severity, badgeClasses: 'bg-gray-100 text-gray-700 border-gray-200' };
  }
}

export const LeakFindingsTable: React.FC<LeakFindingsTableProps> = ({ findings }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm text-gray-900 border-collapse">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200">
          <tr>
            <th scope="col" className="py-3 px-4">Severity</th>
            <th scope="col" className="py-3 px-4">Finding & Rule</th>
            <th scope="col" className="py-3 px-4">Customer</th>
            <th scope="col" className="py-3 px-4">Affected Record</th>
            <th scope="col" className="py-3 px-4">Explanation</th>
            <th scope="col" className="py-3 px-4 text-right">Potential Impact</th>
            <th scope="col" className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {findings.map((item) => {
            const ruleMeta = LEAK_RULE_LABELS[item.rule];
            const severityMeta = getSeverityBadge(item.severity);

            // Determine navigation link safely based on supported application routes
            let destinationRoute: string | null = null;
            if (item.entity_type === 'invoice' && item.entity_id) {
              destinationRoute = `/app/invoices/${encodeURIComponent(item.entity_id)}`;
            } else if (item.entity_type === 'subscription' && item.entity_id) {
              destinationRoute = `/app/subscriptions/${encodeURIComponent(item.entity_id)}`;
            }

            const hasRiskAmount = item.amount_at_risk_minor !== undefined && item.amount_at_risk_minor !== null;

            return (
              <tr key={item.finding_key} className="hover:bg-gray-50 transition-colors">
                {/* Severity */}
                <td className="py-3 px-4 align-top whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge
                      status={item.severity}
                      tone={severityMeta.tone}
                      label={severityMeta.label}
                    />
                  </div>
                </td>

                {/* Finding & Rule */}
                <td className="py-3 px-4 align-top">
                  <div className="font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-indigo-700 font-mono mt-0.5">
                    {ruleMeta?.label || item.rule}
                  </div>
                  {item.detected_at && (
                    <div className="text-[11px] text-gray-400 mt-1">
                      Detected: {new Date(item.detected_at).toLocaleDateString()}
                    </div>
                  )}
                </td>

                {/* Customer */}
                <td className="py-3 px-4 align-top">
                  {item.customer_name ? (
                    <div>
                      <div className="font-medium text-gray-900">{item.customer_name}</div>
                      {item.customer_id && (
                        <div className="text-xs text-gray-400 font-mono">{item.customer_id}</div>
                      )}
                    </div>
                  ) : item.customer_id ? (
                    <span className="text-xs font-mono text-gray-600">{item.customer_id}</span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Not supplied</span>
                  )}
                </td>

                {/* Affected Record */}
                <td className="py-3 px-4 align-top whitespace-nowrap">
                  <div className="text-xs font-medium uppercase text-gray-500">
                    {item.entity_type}
                  </div>
                  <div className="text-xs font-mono font-medium text-gray-800 mt-0.5">
                    {item.entity_id}
                  </div>
                </td>

                {/* Explanation & Recommendation */}
                <td className="py-3 px-4 align-top max-w-xs">
                  <p className="text-xs text-gray-700">{item.explanation}</p>
                  {item.suggested_action && (
                    <div className="mt-1 text-[11px] text-indigo-900 bg-indigo-50/60 p-1.5 rounded border border-indigo-100">
                      <span className="font-semibold">Recommendation: </span>
                      {item.suggested_action}
                    </div>
                  )}
                </td>

                {/* Potential Impact (Only if supplied by backend) */}
                <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                  {hasRiskAmount ? (
                    <span className="font-mono font-medium text-gray-900">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: item.currency || 'INR',
                        minimumFractionDigits: 2,
                      }).format((item.amount_at_risk_minor || 0) / 100)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">—</span>
                  )}
                </td>

                {/* Action Link / Unavailable Button */}
                <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                  {destinationRoute ? (
                    <Link
                      to={destinationRoute}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      Open {item.entity_type === 'invoice' ? 'Invoice' : 'Subscription'} →
                    </Link>
                  ) : (
                    <span
                      title="Direct navigation route not available for this entity type"
                      className="inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                    >
                      Route unavailable
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
