import type { ReactNode } from 'react';
import { LoadingSkeleton } from '../ui';

export function MetricCard({ label, value, description, loading = false }: {
  label: string; value?: ReactNode; description: string; loading?: boolean;
}) {
  return <article className="metric-card">
    <h2>{label}</h2>{loading ? <LoadingSkeleton lines={1} label={`Loading ${label.toLowerCase()}`} /> : <div className="metric-value tabular-nums">{value ?? <span aria-label="Not available">—</span>}</div>}
    <p>{description}</p>
  </article>;
}
