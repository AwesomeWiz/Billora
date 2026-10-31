import { api } from '../../lib/api';
import { parseRegistration, parseSession, type LoginInput, type RegisterInput } from './contract';

export const authService = {
  async session(signal?: AbortSignal) {
    const session = parseSession(await api.get<unknown>('/auth/me', { signal }));
    if (!signal?.aborted) api.setCsrfToken(session.csrf_token);
    return session;
  },
  // Identity is always revalidated via /me after a successful credential mutation.
  async login(input: LoginInput) {
    // Never return LoginOut's raw access_token to the provider or use it as a
    // bearer/CSRF credential. Only cookies plus a verified /me can grant access.
    await api.post<unknown>('/auth/login', { email: input.email.trim().toLowerCase(), password: input.password });
  },
  async register(input: RegisterInput) {
    return parseRegistration(await api.post<unknown>('/auth/register', { email: input.email.trim().toLowerCase(), password: input.password }));
  },
  async logout() { await api.post<unknown>('/auth/logout'); },
  // Reset payloads and delivery statuses are intentionally not invented here.
};
