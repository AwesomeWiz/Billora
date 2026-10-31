import { AlertCircle, LockKeyhole } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'Unable to load this page', description, onRetry, permission = false }: {
  title?: string; description: string; onRetry?: () => void; permission?: boolean;
}) {
  const Icon = permission ? LockKeyhole : AlertCircle;
  return <section className="state-panel" role="alert">
    <span className={`state-icon ${permission ? '' : 'error-icon'}`}><Icon size={24} aria-hidden="true" /></span>
    <h2>{title}</h2><p className="muted">{description}</p>
    {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
  </section>;
}
