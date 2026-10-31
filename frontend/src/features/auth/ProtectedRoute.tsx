import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Brand } from '../../app/Brand';
import { ErrorState, LoadingSkeleton } from '../../components/ui';
import { useAuth } from './AuthProvider';
import { homeForRole, type Role } from './contract';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: readonly Role[] }) {
  const { state, refresh } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <main className="session-screen"><Brand /><LoadingSkeleton lines={5} label="Verifying your session" /></main>;
  if (state.status === 'error') return <main className="session-screen"><Brand />
    <ErrorState title={state.error.status === 403 ? 'Access unavailable' : 'Unable to verify your session'} description={state.error.message}
      permission={state.error.status === 403} onRetry={() => void refresh()} />
    <Link to="/login">Back to sign in</Link>
  </main>;
  if (state.status === 'anonymous') return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
  if (!allowedRoles.includes(state.user.role)) return <Navigate to={homeForRole(state.user.role)} replace />;
  return <Outlet />;
}
