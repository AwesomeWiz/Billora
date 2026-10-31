import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '../../lib/api';
import type { SessionUser, LoginInput, RegisterInput } from './contract';
import { authService } from './service';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'error'; user: null; error: ApiError };

interface AuthContextValue {
  state: AuthState;
  refresh: () => Promise<SessionUser | null>;
  login: (input: LoginInput) => Promise<SessionUser>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const activeRequest = useRef<AbortController | null>(null);
  const revision = useRef(0);

  const refresh = useCallback(async (preserveForm = false) => {
    const requestRevision = ++revision.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    if (!preserveForm) setState({ status: 'loading', user: null });
    try {
      const session = await authService.session(controller.signal);
      if (requestRevision === revision.current && !controller.signal.aborted) setState({ status: 'authenticated', user: session.user });
      return session.user;
    } catch (error) {
      if (requestRevision !== revision.current || controller.signal.aborted) return null;
      if (error instanceof ApiError && error.status === 401) {
        setState({ status: 'anonymous', user: null });
      } else {
        api.setCsrfToken(null);
        setState({ status: 'error', user: null, error: error instanceof ApiError ? error : new ApiError(0, 'SESSION_ERROR', 'Unable to verify your session.') });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = api.onUnauthorized(() => setState({ status: 'anonymous', user: null }));
    void refresh();
    return () => { ++revision.current; activeRequest.current?.abort(); api.setCsrfToken(null); unsubscribe(); };
  }, [refresh]);

  async function login(input: LoginInput) {
    await authService.login(input);
    const user = await refresh(true);
    if (!user) throw new ApiError(0, 'SESSION_UNVERIFIED', 'Sign-in could not be verified. Reconnect to the authentication service before continuing.');
    return user;
  }
  async function register(input: RegisterInput) { await authService.register(input); }
  async function logout() {
    // Keep the current UI/session when logout fails. Never claim server revocation locally.
    await authService.logout();
    ++revision.current;
    activeRequest.current?.abort();
    api.setCsrfToken(null);
    setState({ status: 'anonymous', user: null });
  }

  return <AuthContext.Provider value={{ state, refresh, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
