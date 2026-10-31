import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="state-panel" role="status">
    <span className="state-icon"><Inbox size={24} aria-hidden="true" /></span>
    <h2>{title}</h2><p className="muted">{description}</p>{action && <div className="state-action">{action}</div>}
  </section>;
}
