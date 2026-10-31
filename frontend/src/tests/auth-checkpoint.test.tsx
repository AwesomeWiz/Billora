import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeConfig } from '../app/router';
import { AuthProvider } from '../features/auth/AuthProvider';
import { parseRegistration, passwordError, passwordSymbols } from '../features/auth/contract';
import { authService } from '../features/auth/service';
import { api } from '../lib/api';

const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const registration = { account_id: 'test-account', user_id: 'test-user', role: 'CUSTOMER' as const };
function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}
beforeEach(() => api.setCsrfToken(null));

describe('authentication integration checkpoint', () => {
  it('sends only the verified RegisterIn fields and validates RegisterOut without creating a session', async () => {
    api.setCsrfToken('test-only-csrf');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(registration));
    const payload = { name: 'Unused field', role: 'ADMIN', email: ' CUSTOMER@Example.test ', password: 'ValidPass!' };
    await expect(authService.register(payload)).resolves.toEqual(registration);
    expect(fetcher).toHaveBeenCalledOnce();
    const [path, options] = fetcher.mock.calls[0];
    expect(path).toBe('/api/auth/register');
    expect(JSON.parse(String(options?.body))).toEqual({ email: 'customer@example.test', password: 'ValidPass!' });
    expect(options?.credentials).toBe('include');
    expect((options?.headers as Headers).get('X-CSRF-Token')).toBe('test-only-csrf');
  });

  it.each([{}, { user: { id: 'test-user' } }, { ...registration, role: 'ADMIN' }, { ...registration, user_id: '' }])('does not confirm an unsupported registration response %j', value => {
    expect(() => parseRegistration(value)).toThrow('did not confirm account creation');
  });

  it('matches the checked-in password symbol set and Python character counting', () => {
    for (const symbol of passwordSymbols) expect(passwordError('ValidPass' + symbol)).toBeUndefined();
    expect(passwordError('ÉclairValid!')).toBeUndefined();
    expect(passwordError('ValidPass🙂')).toBeDefined();
    expect(passwordError("ValidPass'")).toBeDefined();
    expect(passwordError('Aa!😀😀😀')).toBeDefined();
    expect(passwordError('ValidPass!')).toBeUndefined(); // No digit required.
  });

  it('does not expose LoginOut access_token or reuse it as a bearer/CSRF credential', async () => {
    api.setCsrfToken('test-only-csrf');
    const store = vi.spyOn(Storage.prototype, 'setItem');
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(json({ access_token: 'test-only-opaque-credential', token_type: 'bearer' }))
      .mockResolvedValueOnce(json({ detail: 'logged out' }));
    await expect(authService.login({ email: ' CUSTOMER@Example.test ', password: 'ValidPass!' })).resolves.toBeUndefined();
    await authService.logout();
    expect(store).not.toHaveBeenCalled();
    for (const [, options] of fetcher.mock.calls) {
      expect(options?.credentials).toBe('include');
      const headers = options?.headers as Headers;
      expect(headers.has('Authorization')).toBe(false);
      expect(headers.get('X-CSRF-Token')).toBe('test-only-csrf');
    }
  });

  it('rejects the actual flat /me shape without synthesizing a user ID or CSRF token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ account_id: 'test-account', email: 'customer@example.test', role: 'CUSTOMER' }));
    await expect(authService.session()).rejects.toMatchObject({ code: 'SESSION_CONTRACT_MISMATCH' });
    expect(api.hasCsrfToken()).toBe(false);
  });

  it.each(['/login', '/register'])('keeps %s unavailable when the backend supplies no anonymous CSRF token', async path => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ detail: 'Missing session token' }, 401));
    open(path);
    const button = await screen.findByRole('button', { name: path === '/login' ? 'Sign in' : 'Create account' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('required to sign in or create an account');
    await userEvent.click(button);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe('/api/auth/me');
    expect(api.hasCsrfToken()).toBe(false);
  });

  it('keeps the protected app closed when /me returns only account identity', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ account_id: 'test-account', email: 'customer@example.test', role: 'CUSTOMER' }));
    const router = open('/app/subscriptions');
    expect(await screen.findByRole('alert')).toHaveTextContent('verified user identity and secure request token');
    expect(router.state.location.pathname).toBe('/app/subscriptions');
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('does not show account-created success for a malformed successful HTTP response', async () => {
    // Test-only future CSRF issuance allows exercising response validation. It is
    // not evidence that the current backend implements anonymous CSRF bootstrap.
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => String(input) === '/api/auth/me'
      ? json({ detail: 'Missing session token' }, 401, { 'X-CSRF-Token': 'test-only-csrf' }) : json({}));
    const router = open('/register');
    await screen.findByRole('heading', { name: 'Start with clarity' });
    await userEvent.type(screen.getByLabelText(/Email address/), 'customer@example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'ValidPass!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm account creation');
    expect(router.state.location.pathname).toBe('/register');
    expect(screen.queryByText('Your account was created. Sign in to continue.')).not.toBeInTheDocument();
  });

  it('never accepts a bearer-only login as a verified application session', async () => {
    let probed = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input) === '/api/auth/login') return json({ access_token: 'test-only-opaque-credential', token_type: 'bearer' });
      if (!probed) { probed = true; return json({}, 401, { 'X-CSRF-Token': 'test-only-csrf' }); }
      return json({ account_id: 'test-account', email: 'customer@example.test', role: 'CUSTOMER' });
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
});
