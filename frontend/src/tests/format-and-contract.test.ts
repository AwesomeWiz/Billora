import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from '../lib/format';
import { homeForRole, parseSession, passwordError, safeReturnPath } from '../features/auth/contract';

describe('financial display and authentication contract', () => {
  it('formats paise exactly as INR and rejects unsafe input', () => {
    expect(formatMoney(206000)).toBe('₹2,060.00');
    expect(formatMoney(1)).toBe('₹0.01');
    expect(formatMoney(0)).toBe('₹0.00');
    expect(() => formatMoney(1.5)).toThrow(RangeError);
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
  it('keeps business dates in Kolkata', () => {
    expect(formatDate('2026-10-31')).toBe('31 Oct 2026');
    expect(formatDate('2026-10-30T22:00:00Z')).toBe('31 Oct 2026');
  });
  it('accepts the documented password rule without imposing a digit', () => {
    expect(passwordError('ValidPass!')).toBeUndefined();
    for (const weak of ['Abcdefg!', 'lowercase!', 'UPPERCASE!', 'NoSpecialLetters', 'Spaces only A']) expect(passwordError(weak)).toBeDefined();
  });
  it('fails closed for unsupported roles, missing CSRF, and missing customer account', () => {
    const session = { user: { id: 'u-1', email: 'customer@example.test', role: 'CUSTOMER', account_id: 'account-1' }, csrf_token: 'csrf' };
    expect(parseSession(session)).toEqual(session);
    expect(() => parseSession({ ...session, user: { ...session.user, role: 'SUPERUSER' } })).toThrow();
    expect(() => parseSession({ ...session, csrf_token: '' })).toThrow();
    expect(() => parseSession({ ...session, user: { ...session.user, account_id: null } })).toThrow();
  });
  it('uses server roles for home paths and prevents open or cross-role redirects', () => {
    expect(homeForRole('STAFF')).toBe('/app/overview');
    expect(homeForRole('CUSTOMER')).toBe('/portal/home');
    expect(safeReturnPath('https://evil.test', 'ADMIN')).toBe('/app/overview');
    expect(safeReturnPath('/app/overview', 'CUSTOMER')).toBe('/portal/home');
    expect(safeReturnPath('/portal/../../app/overview', 'CUSTOMER')).toBe('/portal/home');
    expect(safeReturnPath('/app/invoices?page=2', 'STAFF')).toBe('/app/invoices?page=2');
  });
});
