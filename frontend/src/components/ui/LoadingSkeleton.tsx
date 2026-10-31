export function LoadingSkeleton({ lines = 3, label = 'Loading' }: { lines?: number; label?: string }) {
  return <div role="status" aria-label={label} className="skeleton-group">
    <span className="sr-only">{label}</span>
    {Array.from({ length: lines }, (_, index) => <div key={index} className="skeleton" aria-hidden="true" />)}
  </div>;
}
