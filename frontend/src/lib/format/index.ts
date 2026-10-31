/** Display only. Calculations and balances must come from the server. */
export function formatMoney(amountMinor: number, currency = 'INR', locale = 'en-IN'): string {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError('Money must be a safe integer in minor units.');
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(amountMinor / 10 ** digits);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  // Date-only business values must not shift across device timezones.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...options, timeZone: 'Asia/Kolkata',
  }).format(date);
}
