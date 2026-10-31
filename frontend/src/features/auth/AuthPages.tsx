import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleDot, Layers3, ShieldCheck } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../../app/Brand';
import { Button, Input, LoadingSkeleton } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from './AuthProvider';
import { homeForRole, passwordError, safeReturnPath } from './contract';

export function AuthLayout() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'authenticated') return <Navigate to={safeReturnPath(location.state?.from, state.user.role)} replace />;
  return <div className="auth-layout">
    <aside className="auth-story">
      <Brand />
      <div className="auth-story-content">
        <span className="eyebrow"><span className="small-line" /> SUBSCRIPTION OPERATIONS</span>
        <h1>A clear view.<br />Every billing cycle.</h1>
        <p>Bring your subscriptions, invoices, and payments into one considered workspace.</p>
        <div className="cycle-visual" aria-hidden="true">
          <div className="cycle-track" /><div className="cycle-core"><Layers3 size={32} /><span>One connected workflow</span></div>
          <span className="cycle-label cycle-label-one"><CircleDot size={17} /> Subscribe</span>
          <span className="cycle-label cycle-label-two"><CheckCircle2 size={17} /> Invoice</span>
          <span className="cycle-label cycle-label-three"><Check size={17} /> Reconcile</span>
        </div>
      </div>
      <p className="auth-story-footer">Built for clarity. Designed for the work ahead.</p>
    </aside>
    <main id="main-content" className="auth-main">
      <div className="mobile-brand"><Brand /></div>
      <div className="auth-form-area">{state.status === 'loading'
        ? <LoadingSkeleton lines={5} label="Checking your session" /> : <Outlet />}</div>
      <p className="auth-footer"><ShieldCheck size={15} aria-hidden="true" /> Your workspace uses secure, cookie-based sessions.</p>
    </main>
  </div>;
}

function ConnectionNotice() {
  const { state, refresh } = useAuth();
  const ready = api.hasCsrfToken();
  if (state.status !== 'error' && ready) return null;
  return <div className="notice notice-warning" role="status">
    <strong>{state.status === 'error' ? 'Authentication service unavailable' : 'Secure sign-in is not ready'}</strong>
    <p>{state.status === 'error' ? state.error.message : 'The service has not issued a secure request token. Please reconnect before submitting.'}</p>
    <Button variant="secondary" onClick={() => void refresh()}>Reconnect</Button>
  </div>;
}

function FormError({ message }: { message: string | null }) {
  return message ? <div className="notice notice-error" role="alert">{message}</div> : null;
}

export function LoginPage() {
  const { login, state } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true); setError(null);
    try {
      const user = await login({ email: String(form.get('email')).trim().toLowerCase(), password: String(form.get('password')) });
      navigate(safeReturnPath(location.state?.from, user.role), { replace: true });
    } catch (err) { setError(errorMessage(err)); }
    finally { setPending(false); }
  }
  return <>
    <span className="eyebrow">WELCOME TO BILLORA</span>
    <h2 className="auth-title">Welcome back</h2><p className="auth-description">Sign in to your workspace to keep things moving.</p>
    {location.state?.registered && <div className="notice notice-success" role="status">Your account was created. Sign in to continue.</div>}
    <ConnectionNotice />
    <form onSubmit={submit} className="auth-form" aria-label="Sign in">
      <Input label="Work email" type="email" name="email" autoComplete="username" placeholder="you@company.com" required maxLength={254} />
      <Input label="Password" type="password" name="password" autoComplete="current-password" required />
      <div className="form-link-row"><Link to="/forgot-password">Forgot password?</Link></div>
      <FormError message={error} />
      <Button type="submit" loading={pending} disabled={state.status === 'error' || !api.hasCsrfToken()} className="full-width">Sign in <ArrowRight size={16} aria-hidden="true" /></Button>
    </form>
    <p className="auth-switch">New to Billora? <Link to="/register">Create an account</Link></p>
  </>;
}

export function RegisterPage() {
  const { register, state } = useAuth();
  const navigate = useNavigate();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    const invalid = passwordError(password);
    setValidation(invalid);
    if (invalid) { passwordRef.current?.focus(); return; }
    setPending(true); setError(null);
    try {
      await register({ name: String(data.get('name')).trim(), email: String(data.get('email')).trim().toLowerCase(), password });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) { setError(errorMessage(err)); }
    finally { setPending(false); }
  }
  return <>
    <span className="eyebrow">YOUR CUSTOMER WORKSPACE</span>
    <h2 className="auth-title">Start with clarity</h2><p className="auth-description">Create an account to view your subscriptions and bills.</p>
    <ConnectionNotice />
    <form onSubmit={submit} className="auth-form" aria-label="Create account">
      <Input label="Full name" name="name" autoComplete="name" required maxLength={120} pattern=".*\S.*" />
      <Input label="Email address" type="email" name="email" autoComplete="username" required maxLength={254} />
      <Input ref={passwordRef} label="Password" type="password" name="password" autoComplete="new-password" minLength={9} required
        hint="At least 9 characters with uppercase, lowercase, and a special character. No number required."
        error={validation} onChange={() => setValidation(undefined)} />
      <FormError message={error} />
      <Button type="submit" loading={pending} disabled={state.status === 'error' || !api.hasCsrfToken()} className="full-width">Create account <ArrowRight size={16} aria-hidden="true" /></Button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </>;
}

export function ForgotPasswordPage() {
  return <>
    <Link className="back-link" to="/login"><ArrowLeft size={16} aria-hidden="true" /> Back to sign in</Link>
    <h2 className="auth-title">Forgot your password?</h2><p className="auth-description">Request a secure link to reset your password.</p>
    <div className="notice notice-warning" role="status"><strong>Password recovery is not connected yet</strong><p>The reset service is awaiting integration. No email has been sent.</p></div>
    <form className="auth-form" aria-label="Request password reset" onSubmit={event => event.preventDefault()}>
      <Input label="Email address" name="email" type="email" autoComplete="email" required />
      <Button type="submit" disabled aria-describedby="recovery-unavailable">Request reset link</Button>
      <p className="field-hint" id="recovery-unavailable">Password recovery will be available when the authentication service is connected.</p>
    </form>
  </>;
}

export function ResetPasswordPage() {
  const location = useLocation();
  const hasToken = Boolean(new URLSearchParams(location.search).get('token'));
  return <>
    <Link className="back-link" to="/login"><ArrowLeft size={16} aria-hidden="true" /> Back to sign in</Link>
    <h2 className="auth-title">Choose a new password</h2>
    <p className="auth-description">Use a strong password unique to your Billora account.</p>
    {!hasToken ? <div className="notice notice-error" role="alert">This link does not contain a reset token. <Link to="/forgot-password">Request a new link</Link>.</div>
      : <div className="notice notice-warning" role="status">Password reset is awaiting service integration. Your password has not been changed.</div>}
    <form className="auth-form" aria-label="Reset password" onSubmit={event => event.preventDefault()}>
      <Input label="New password" type="password" name="password" autoComplete="new-password" minLength={9} required
        hint="At least 9 characters with uppercase, lowercase, and a special character." />
      <Input label="Confirm new password" type="password" name="confirm_password" autoComplete="new-password" minLength={9} required />
      <Button type="submit" disabled aria-describedby="reset-unavailable">Reset password</Button>
      <p className="field-hint" id="reset-unavailable">Reset submission is unavailable until the secure reset service is connected.</p>
    </form>
  </>;
}

export function SessionHomeRedirect() {
  const { state } = useAuth();
  if (state.status === 'loading') return <main className="session-screen"><Brand /><LoadingSkeleton lines={4} label="Checking your session" /></main>;
  return <Navigate to={state.user ? homeForRole(state.user.role) : '/login'} replace />;
}
