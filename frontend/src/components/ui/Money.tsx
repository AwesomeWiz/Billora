import { formatMoney } from '../../lib/format';

export function Money({ amountMinor, currency = 'INR', locale = 'en-IN', className = '' }: {
  amountMinor: number; currency?: string; locale?: string; className?: string;
}) {
  return <span className={`tabular-nums ${className}`}>{formatMoney(amountMinor, currency, locale)}</span>;
}
