import { api, ApiError } from '../../lib/api';
import { parseCsrf, parseRegistration, parseSession, type LoginInput, type RegisterInput } from './contract';

async function bootstrapCsrf(signal?: AbortSignal) {
  api.setCsrfToken(null);
  try {
    const token = parseCsrf(await api.get<unknown>('/auth/csrf', { signal }));
    if (!signal?.aborted) api.setCsrfToken(token);
  } catch (error) {
    if (!signal?.aborted) api.setCsrfToken(null);
    throw error;
  }
}

export const authService = {
  async session(signal?: AbortSignal) {
    try {
      const session = parseSession(await api.get<unknown>('/auth/me', { signal }));
      if (!signal?.aborted) api.setCsrfToken(session.csrf_token);
      return session;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ApiError && error.status === 401) {
        // A real, cookie-bound anonymous bootstrap now exists. It does not grant a session.
        await bootstrapCsrf(signal);
      } else api.setCsrfToken(null);
      throw error;
    }
  },
  // Identity is always revalidated via /me after a successful credential mutation.
  async login(input: LoginInput) {
    // LoginOut.detail is not session identity. Discard legacy bearer fields too;
    // only cookies plus a verified /me can grant protected application access.
    await api.post<unknown>('/auth/login', { email: input.email.trim().toLowerCase(), password: input.password });
  },
  async register(input: RegisterInput) {
    return parseRegistration(await api.post<unknown>('/auth/register', { email: input.email.trim().toLowerCase(), password: input.password }));
  },
  async logout() { await api.post<unknown>('/auth/logout'); },
  // Reset payloads and delivery statuses are intentionally not invented here.
};
