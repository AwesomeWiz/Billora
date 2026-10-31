import { api } from '../../lib/api';
import { parseSession, type LoginInput, type RegisterInput } from './contract';

export const authService = {
  async session(signal?: AbortSignal) {
    const session = parseSession(await api.get<unknown>('/auth/me', { signal }));
    if (!signal?.aborted) api.setCsrfToken(session.csrf_token);
    return session;
  },
  // Identity is always revalidated via /me after a successful credential mutation.
  login: (input: LoginInput) => api.post<unknown>('/auth/login', input),
  register: (input: RegisterInput) => api.post<unknown>('/auth/register', input),
  logout: () => api.post<void>('/auth/logout'),
  // Reset payloads and delivery statuses are intentionally not invented here.
};
