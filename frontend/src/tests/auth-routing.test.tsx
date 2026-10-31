import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../features/auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { authService } from '../features/auth/service';
import { routeConfig } from '../app/router';

const internal = { user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' as const, account_id: null }, csrf_token: 'test-csrf' };
const customer = { user: { id: 'customer-1', email: 'customer@example.test', role: 'CUSTOMER' as const, account_id: 'account-1' }, csrf_token: 'test-csrf' };

function open(path: string) {
  const router = createMemoryRouter(routeConfig, { initialEntries: [path] });
  render(<AuthProvider><RouterProvider router={router} /></AuthProvider>);
  return router;
}

beforeEach(() => api.setCsrfToken(null));

describe('protected routing and honest integration states', () => {
  it('keeps the shell hidden until the server session resolves', async () => {
    let resolve!: (value: typeof internal) => void;
    vi.spyOn(authService, 'session').mockImplementation(() => new Promise(done => { resolve = done; }));
    open('/app/overview');
    expect(screen.getByRole('status', { name: 'Verifying your session' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
    resolve(internal);
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Actual billings and collected payments')).toBeInTheDocument();
  });

  it('redirects an unauthenticated deep link to sign-in and preserves its location', async () => {
    vi.spyOn(authService, 'session').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Sign in required'));
    const router = open('/app/invoices?page=2');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state.from).toBe('/app/invoices?page=2');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });

  it('shows a retryable backend outage instead of a false anonymous session', async () => {
    vi.spyOn(authService, 'session').mockRejectedValue(new ApiError(503, 'UNAVAILABLE', 'Service unavailable'));
    const router = open('/app/overview');
    expect(await screen.findByRole('heading', { name: 'Unable to verify your session' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/overview');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('recovers from a service outage only after a successful retry', async () => {
    vi.spyOn(authService, 'session').mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', 'Service unavailable')).mockResolvedValue(internal);
    open('/app/overview');
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('shows a permission state when session access is forbidden', async () => {
    vi.spyOn(authService, 'session').mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'Your access is restricted.'));
    open('/app/overview');
    expect(await screen.findByRole('heading', { name: 'Access unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your access is restricted.');
  });

  it('redirects customers away from internal URLs and omits admin navigation', async () => {
    vi.spyOn(authService, 'session').mockResolvedValue(customer);
    const router = open('/app/overview');
    expect(await screen.findByRole('heading', { name: 'Your billing, in one place' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/portal/home');
    expect(screen.queryByText('Staff')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
  });

  it('redirects staff away from customer pages without admin configuration', async () => {
    vi.spyOn(authService, 'session').mockResolvedValue({ ...internal, user: { ...internal.user, role: 'STAFF' } });
    const router = open('/portal/home');
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/overview');
    expect(screen.queryByText('CONFIGURATION')).not.toBeInTheDocument();
  });

  it('keeps the session visible after a failed logout and clears it after confirmed logout', async () => {
    vi.spyOn(authService, 'session').mockResolvedValue(internal);
    const logout = vi.spyOn(authService, 'logout').mockRejectedValueOnce(new ApiError(500, 'FAILED', 'Service error')).mockResolvedValue(undefined);
    const router = open('/app/overview');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-out could not be confirmed');
    expect(router.state.location.pathname).toBe('/app/overview');
    await userEvent.click(screen.getByRole('button', { name: 'Retry sign out' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(2);
  });

  it('normalizes login email and grants access only after the session probe', async () => {
    vi.spyOn(authService, 'session').mockImplementationOnce(async () => {
      api.setCsrfToken('test-anonymous-csrf');
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required');
    }).mockResolvedValue(internal);
    const login = vi.spyOn(authService, 'login').mockResolvedValue(undefined);
    open('/login');
    await screen.findByRole('heading', { name: 'Welcome back' });
    await userEvent.type(screen.getByLabelText(/Work email/), 'ADMIN@Example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'ValidPass!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith({ email: 'admin@example.test', password: 'ValidPass!' });
  });

  it('shows a failed post-login session verification on the form', async () => {
    vi.spyOn(authService, 'session').mockImplementation(async () => {
      api.setCsrfToken('test-anonymous-csrf');
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required');
    });
    vi.spyOn(authService, 'login').mockResolvedValue(undefined);
    open('/login');
    await screen.findByRole('heading', { name: 'Welcome back' });
    await userEvent.type(screen.getByLabelText(/Work email/), 'admin@example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'ValidPass!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in could not be verified');
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('creates a customer account without supplying a role or assuming a session', async () => {
    vi.spyOn(authService, 'session').mockImplementation(async () => {
      api.setCsrfToken('anonymous-csrf');
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required');
    });
    const register = vi.spyOn(authService, 'register').mockResolvedValue({ account_id: customer.user.account_id, user_id: customer.user.id, role: 'CUSTOMER' });
    const router = open('/register');
    await screen.findByRole('heading', { name: 'Start with clarity' });
    expect(screen.queryByLabelText(/Full name/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Email address/), 'Customer@Example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'ValidPass!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your account was created.');
    expect(router.state.location.pathname).toBe('/login');
    expect(register).toHaveBeenCalledWith({ email: 'customer@example.test', password: 'ValidPass!' });
  });

  it('focuses the password field and rejects a weak registration before any API write', async () => {
    vi.spyOn(authService, 'session').mockImplementation(async () => {
      api.setCsrfToken('anonymous-csrf');
      throw new ApiError(401, 'UNAUTHORIZED', 'Sign in required');
    });
    const register = vi.spyOn(authService, 'register');
    open('/register');
    await screen.findByRole('heading', { name: 'Start with clarity' });
    await userEvent.type(screen.getByLabelText(/Email address/), 'customer@example.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'lowercaseonly!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByLabelText(/^Password/)).toHaveFocus();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute('aria-invalid', 'true');
    expect(register).not.toHaveBeenCalled();
  });

  it('removes protected content immediately when a subsequent API call reports session expiry', async () => {
    vi.spyOn(authService, 'session').mockResolvedValue(internal);
    open('/app/overview');
    await screen.findByRole('heading', { name: 'Overview' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await act(async () => {
      await expect(api.get('/accounts')).rejects.toMatchObject({ status: 401 });
    });
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it.each(['/forgot-password', '/reset-password?token=test-only'])('keeps recovery submission unavailable at %s', async path => {
    vi.spyOn(authService, 'session').mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Sign in required'));
    const router = open(path);
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Checking your session' })).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe(path.split('?')[0]);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/not connected|awaiting service integration/);
  });
});
