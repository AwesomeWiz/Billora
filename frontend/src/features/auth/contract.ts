/**
 * Narrow frontend adapter for docs/ARCHITECTURE.md §3.1 and §7.3.
 * contracts/api-types.ts and contracts/enums.ts do not exist yet. Replace these
 * adapter types with coordinated shared imports when Adithya publishes them.
 * These are not new backend contracts.
 */
import { ApiError, isRecord } from '../../lib/api';

export const roles = ['ADMIN', 'STAFF', 'CUSTOMER'] as const;
export type Role = typeof roles[number];
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  account_id?: string | null;
}
export interface Session {
  user: SessionUser;
  csrf_token: string;
}
export interface LoginInput { email: string; password: string }
export interface RegisterInput extends LoginInput { name: string }

export function parseSession(value: unknown): Session {
  if (!isRecord(value) || !isRecord(value.user)) throw invalidSession();
  const user = value.user;
  if (typeof user.id !== 'string' || !user.id || typeof user.email !== 'string' || !user.email ||
    !roles.includes(user.role as Role) || typeof value.csrf_token !== 'string' || !value.csrf_token.trim() ||
    (user.account_id !== undefined && user.account_id !== null && typeof user.account_id !== 'string') ||
    (user.role === 'CUSTOMER' && (typeof user.account_id !== 'string' || !user.account_id))) throw invalidSession();
  return {
    user: { id: user.id, email: user.email, role: user.role as Role, account_id: user.account_id as string | null | undefined },
    csrf_token: value.csrf_token,
  };
}
function invalidSession() {
  return new ApiError(0, 'INVALID_SESSION', 'The authentication service returned an unsupported session. Please reconnect or contact your administrator.');
}

export function homeForRole(role: Role): string {
  return role === 'CUSTOMER' ? '/portal/home' : '/app/overview';
}

/** Prevent external redirects and keep a remembered location inside the user's area. */
export function safeReturnPath(value: unknown, role: Role): string {
  const prefix = role === 'CUSTOMER' ? '/portal/' : '/app/';
  if (typeof value !== 'string' || !value.startsWith(prefix) || /[\\\r\n]/.test(value)) return homeForRole(role);
  const url = new URL(value, 'https://billora.invalid');
  return url.origin === 'https://billora.invalid' && url.pathname.startsWith(prefix)
    ? `${url.pathname}${url.search}${url.hash}` : homeForRole(role);
}

export function passwordError(password: string): string | undefined {
  return password.length > 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9\s]/.test(password)
    ? undefined : 'Use at least 9 characters, an uppercase letter, a lowercase letter, and a special character.';
}
