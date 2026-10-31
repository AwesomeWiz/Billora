import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui';
import type { NotificationItem } from '../types';

interface NotificationListProps {
  items: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  markingId: string | null;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  items,
  onMarkAsRead,
  markingId,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
      {items.map((notif) => {
        let destinationRoute: string | null = null;
        if (notif.entity_type === 'invoice' && notif.entity_id) {
          destinationRoute = `/app/invoices/${encodeURIComponent(notif.entity_id)}`;
        } else if (notif.entity_type === 'subscription' && notif.entity_id) {
          destinationRoute = `/app/subscriptions/${encodeURIComponent(notif.entity_id)}`;
        } else if (notif.entity_type === 'quotation') {
          destinationRoute = `/app/quotations`;
        }

        const formattedDate = new Date(notif.created_at).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        return (
          <div
            key={notif.id}
            className={`p-4 transition-colors flex items-start gap-4 ${
              notif.is_read ? 'bg-white opacity-80' : 'bg-indigo-50/20'
            }`}
          >
            {/* Unread Indicator */}
            <div className="pt-1.5">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  notif.is_read ? 'bg-gray-300' : 'bg-indigo-600 ring-2 ring-indigo-100'
                }`}
                title={notif.is_read ? 'Read' : 'Unread'}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {notif.category}
                </span>
                <span className="text-xs text-gray-500 font-mono">{formattedDate}</span>
              </div>

              <h4 className="mt-1 text-sm font-semibold text-gray-900">{notif.title}</h4>
              <p className="mt-0.5 text-xs text-gray-600">{notif.message}</p>

              <div className="mt-2 flex items-center gap-3 text-xs">
                {destinationRoute && (
                  <Link
                    to={destinationRoute}
                    className="font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View Record →
                  </Link>
                )}
              </div>
            </div>

            {/* Mark as read button */}
            {!notif.is_read && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => onMarkAsRead(notif.id)}
                disabled={markingId === notif.id}
                className="text-xs py-1 px-2.5 whitespace-nowrap"
              >
                {markingId === notif.id ? 'Marking...' : 'Mark read'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

