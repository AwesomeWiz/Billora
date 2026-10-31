import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui';
import { ACTIVITY_EVENT_LABELS } from '../types';
import type { ActivityItem } from '../types';

interface ActivityFeedProps {
  items: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
      {items.map((item) => {
        const meta = ACTIVITY_EVENT_LABELS[item.event_type] || {
          label: item.event_type,
          tone: 'neutral',
        };

        // Determine destination link safely based on supported application routes
        let destinationRoute: string | null = null;
        if (item.entity_type === 'subscription' && item.entity_id) {
          destinationRoute = `/app/subscriptions/${encodeURIComponent(item.entity_id)}`;
        } else if (item.entity_type === 'invoice' && item.entity_id) {
          destinationRoute = `/app/invoices/${encodeURIComponent(item.entity_id)}`;
        } else if (item.entity_type === 'customer' && item.entity_id) {
          destinationRoute = `/app/customers/${encodeURIComponent(item.entity_id)}`;
        } else if (item.entity_type === 'quotation') {
          destinationRoute = `/app/quotations`;
        }

        const formattedDate = new Date(item.timestamp).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        return (
          <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={meta.label} tone={meta.tone} />
                <span className="text-xs text-gray-500 font-mono">{formattedDate}</span>
                {item.actor && (
                  <span className="text-xs text-gray-500">
                    by <span className="font-medium text-gray-700">{item.actor.name || item.actor.email}</span>
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-gray-900 leading-snug">{item.description}</p>

              <div className="mt-2 flex items-center gap-3 text-xs">
                {destinationRoute ? (
                  <Link
                    to={destinationRoute}
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View {item.entity_label || item.entity_type} →
                  </Link>
                ) : item.entity_id ? (
                  <span className="text-gray-400">
                    {item.entity_type}: <span className="font-mono text-gray-500">{item.entity_id}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

