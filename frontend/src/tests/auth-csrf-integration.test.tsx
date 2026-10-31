import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { parseCsrf, parseSession } from '../features/auth/contract';
import { authService } from '../features/auth/service';
import { api } from '../lib/api';

const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const registration = { account_id: 'test-account', user_id: 'test-user', role: 'CUSTOMER' };
const incompleteSession = { user: { account_id: 'test-account', email: 'customer@example.test', role: 'CUSTOMER' }, csrf_token: 'server-session-csrf' };
function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>); return router;
}
beforeEach(() => api.setCsrfToken(null));

describe('verified anonymous CSRF bootstrap', () => {
  it('requests the checked-in bootstrap only after anonymous /me and sends its value on credential mutations', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ csrf_token: 'server-issued-test-csrf' }))
      .mockResolvedValueOnce(json(registration));
    await expect(authService.session()).rejects.toMatchObject({ status: 401 });
    expect(api.hasCsrfToken()).toBe(true);
    await expect(authService.register({ email: ' CUSTOMER@Example.test ', password: 'ValidPass!' })).resolves.toEqual(registration);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me', '/api/auth/csrf', '/api/auth/register']);
    for (const [, options] of fetcher.mock.calls) expect(options?.credentials).toBe('include');
    const headers = fetcher.mock.calls[2][1]?.headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('server-issued-test-csrf');
    expect(headers.has('Authorization')).toBe(false); expect(storage).not.toHaveBeenCalled();
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({ email: 'customer@example.test', password: 'ValidPass!' });
  });

  it('keeps identity anonymous while enabling real registration after successful bootstrap', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input) === '/api/auth/me') return json({}, 401);
      if (String(input) === '/api/auth/csrf') return json({ csrf_token: 'server-issued-test-csrf' });
      return json(registration);
    });
    const router = open('/register');
    const submit = await screen.findByRole('button', { name: 'Create account' }); expect(submit).toBeEnabled();
    await userEvent.type(screen.getByLabelText(/Email address/), 'customer@example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'ValidPass!');
    await userEvent.click(submit);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your account was created');
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it.each([{}, { csrf_token: '' }, { csrf_token: '   ' }, { csrf_token: null }, { csrf_token: 123 }, { access_token: 'not-csrf' }])('rejects malformed bootstrap %j without accepting an incidental response header', async malformed => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json(malformed, 200, { 'X-CSRF-Token': 'header-not-a-valid-body' }));
    await expect(authService.session()).rejects.toMatchObject({ code: 'CSRF_CONTRACT_MISMATCH' });
    expect(api.hasCsrfToken()).toBe(false);
    await expect(authService.login({ email: 'customer@example.test', password: 'ValidPass!' })).rejects.toMatchObject({ code: 'CSRF_UNAVAILABLE' });
  });

  it.each([404, 503])('leaves credential forms disabled when bootstrap returns HTTP %s', async status => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input) === '/api/auth/me' ? json({}, 401) : json({}, status)); open('/login');
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Authentication service unavailable');
  });

  it.each([403, 503])('does not hide /me HTTP %s behind anonymous bootstrap', async status => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, status));
    await expect(authService.session()).rejects.toMatchObject({ status });
    expect(fetcher).toHaveBeenCalledOnce(); expect(api.hasCsrfToken()).toBe(false);
  });

  it('does not bootstrap or grant access for the actual nested session missing a user ID', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(incompleteSession));
    api.setCsrfToken('stale-token');
    await expect(authService.session()).rejects.toMatchObject({ code: 'SESSION_CONTRACT_MISMATCH' });
    expect(fetcher).toHaveBeenCalledOnce(); expect(api.hasCsrfToken()).toBe(false);
    expect(() => parseSession(incompleteSession)).toThrow(/did not return a user ID/);
  });

  it('accepts a complete server session without requesting an anonymous token', async () => {
    const complete = { ...incompleteSession, user: { ...incompleteSession.user, id: 'real-server-user-id' } };
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(complete));
    await expect(authService.session()).resolves.toEqual(complete);
    expect(fetcher).toHaveBeenCalledOnce(); expect(api.hasCsrfToken()).toBe(true);
  });

  it('rejects whitespace-only user identity instead of creating a session', () => {
    expect(() => parseSession({ ...incompleteSession, user: { ...incompleteSession.user, id: '  ' } })).toThrow();
    expect(() => parseCsrf({ csrf_token: false })).toThrow();
  });

  it('retains the missing-ID failure after a successful backend login without substituting account_id', async () => {
    let loggedIn = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const path = String(input);
      if (path === '/api/auth/csrf') return json({ csrf_token: 'server-issued-test-csrf' });
      if (path === '/api/auth/login') { loggedIn = true; return json({ detail: 'logged in' }); }
      return loggedIn ? json(incompleteSession) : json({}, 401);
    });
    const router = open('/login');
    await screen.findByRole('heading', { name: 'Welcome back' });
    await userEvent.type(screen.getByLabelText(/Work email/), 'customer@example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'ValidPass!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in could not be verified');
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('ignores an aborted bootstrap body without clearing a newer token', async () => {
    let finish!: (response: Response) => void;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({}, 401)).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(json({ detail: 'logged out' }));
    const controller = new AbortController();
    const pending = authService.session(controller.signal).catch(error => error);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    controller.abort(); api.setCsrfToken('newer-session-csrf');
    await act(async () => finish(json({ csrf_token: 'stale-bootstrap-csrf' })));
    await pending;
    await api.post('/auth/logout');
    expect((fetcher.mock.calls[2][1]?.headers as Headers).get('X-CSRF-Token')).toBe('newer-session-csrf');
  });
});
