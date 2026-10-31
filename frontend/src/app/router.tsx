import { Link, Navigate, useRouteError } from 'react-router-dom';
import { AuthLayout, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, SessionHomeRedirect } from '../features/auth/AuthPages';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PortalHome, AccountPage } from '../features/customer/PortalHome';
import { CustomersPage } from '../features/customer/CustomersPage';
import { CustomerDetailPage } from '../features/customer/CustomerDetailPage';
import { SubscriptionsPage } from '../features/subscriptions/SubscriptionsPage';
import { WorkspaceHome } from '../features/dashboard/WorkspaceHome';
import { ErrorState, EmptyState } from '../components/ui';
import { AppShell } from './AppShell';
import { Brand } from './Brand';

function NotFoundPage({ embedded = false }: { embedded?: boolean }) {
  const content = <EmptyState title="This page is not available" description="The page may have moved or its module has not been integrated yet." action={<Link className="button button-primary" to="/">Back to workspace</Link>} />;
  return embedded ? <section>{content}</section> : <main className="session-screen"><Brand />{content}</main>;
}

function RouteErrorBoundary() {
  useRouteError(); // Do not expose runtime errors or sensitive route data in the UI.
  return <main className="session-screen"><Brand /><ErrorState title="This page could not open" description="Reload the page to try again." onRetry={() => window.location.reload()} /></main>;
}

/** Only the integration owner edits this route tree. Add teammate exports here after review. */
export const routeConfig = [
  { path: '/', element: <SessionHomeRedirect />, errorElement: <RouteErrorBoundary /> },
  { element: <AuthLayout />, errorElement: <RouteErrorBoundary />, children: [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
  ] },
  { element: <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />, errorElement: <RouteErrorBoundary />, children: [
    { path: '/app', element: <AppShell />, children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <WorkspaceHome /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: '*', element: <NotFoundPage embedded /> },
    ] },
  ] },
  { element: <ProtectedRoute allowedRoles={['CUSTOMER']} />, errorElement: <RouteErrorBoundary />, children: [
    { path: '/portal', element: <AppShell />, children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <PortalHome /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage embedded /> },
    ] },
  ] },
  { path: '*', element: <NotFoundPage /> },
];
