/**
 * Feature-local authentication adapter. Registration follows the inspected
 * backend/app/schemas/auth.py; session acceptance retains Architecture §7.3's
 * verified user identity and CSRF requirements. See INTEGRATION.md for blockers.
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
export type RegisterInput = LoginInput;
export interface RegistrationResult { account_id: string; user_id: string; role: 'CUSTOMER' }

export function parseRegistration(value: unknown): RegistrationResult {
  if (!isRecord(value) || typeof value.account_id !== 'string' || !value.account_id.trim() ||
    typeof value.user_id !== 'string' || !value.user_id.trim() || value.role !== 'CUSTOMER') {
    throw new ApiError(0, 'REGISTRATION_UNVERIFIED', 'The service response did not confirm account creation. Check with your administrator before submitting again.');
  }
  return { account_id: value.account_id, user_id: value.user_id, role: 'CUSTOMER' };
}

export function parseSession(value: unknown): Session {
  // An account ID is not a user ID. Neither it nor a login access_token is CSRF.
  if (isRecord(value) && !isRecord(value.user) && typeof value.account_id === 'string' && typeof value.email === 'string' && typeof value.role === 'string') {
    throw new ApiError(0, 'SESSION_CONTRACT_MISMATCH', 'The authentication service has not supplied a verified user identity and secure request token. Sign-in cannot be verified yet.');
  }
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

/** Exact special-character set in backend RegisterIn.pwd_complex. No digit requirement. */
export const passwordSymbols = '!@#$%^&*()-_=+[]{}|;:,.<>?/';
export function passwordError(password: string): string | undefined {
  return [...password].length > 8 && /\p{Uppercase}/u.test(password) && /\p{Lowercase}/u.test(password) && [...password].some(char => passwordSymbols.includes(char))
    ? undefined : 'Use at least 9 characters, uppercase, lowercase, and a supported special character: ' + passwordSymbols;
}
