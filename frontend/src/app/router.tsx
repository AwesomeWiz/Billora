import { Link, Navigate, useRouteError } from 'react-router-dom';
import { AuthLayout, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, SessionHomeRedirect } from '../features/auth/AuthPages';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PortalHome, AccountPage } from '../features/customer/PortalHome';
import { PortalSubscriptions } from '../features/customer/PortalSubscriptions';
import { PortalInvoices } from '../features/customer/PortalInvoices';
import { CustomersPage } from '../features/customer/CustomersPage';
import { CustomerDetailPage } from '../features/customer/CustomerDetailPage';
import { SubscriptionsPage } from '../features/subscriptions/SubscriptionsPage';
import { SubscriptionDetailPage } from '../features/subscriptions/SubscriptionDetailPage';
import { InvoiceListPage } from '../features/billing/InvoiceListPage';
import { InvoiceDetailPage } from '../features/billing/InvoiceDetailPage';
import { ProductsPage } from '../features/admin/products';
import { PlansPage } from '../features/admin/plans';
import { TaxesPage } from '../features/admin/taxes';
import { DiscountsPage } from '../features/admin/discounts';
import { QuotationTemplatesPage, QuotationsPage } from '../features/quotations';
import { WorkspaceHome } from '../features/dashboard/WorkspaceHome';
import { ReportsPage } from '../features/dashboard/ReportsPage';
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
      { path: 'reports', element: <ReportsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'subscriptions/:id', element: <SubscriptionDetailPage /> },
      { path: 'quotations', element: <QuotationsPage /> },
      { path: 'invoices', element: <InvoiceListPage /> },
      { path: 'invoices/:id', element: <InvoiceDetailPage /> },
      { path: 'catalog/products', element: <ProductsPage /> },
      { path: 'catalog/plans', element: <PlansPage /> },
      // TaxesPage has no STAFF read-only mode; protect its mutation controls at the route.
      { element: <ProtectedRoute allowedRoles={['ADMIN']} />, children: [
        { path: 'catalog/taxes', element: <TaxesPage /> },
      ] },
      { path: 'catalog/discounts', element: <DiscountsPage /> },
      { path: 'quotation-templates', element: <QuotationTemplatesPage /> },
      { path: '*', element: <NotFoundPage embedded /> },
    ] },
  ] },
  { element: <ProtectedRoute allowedRoles={['CUSTOMER']} />, errorElement: <RouteErrorBoundary />, children: [
    { path: '/portal', element: <AppShell />, children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'home', element: <PortalHome /> },
      { path: 'subscriptions', element: <PortalSubscriptions /> },
      { path: 'subscriptions/:id', element: <PortalSubscriptions detail /> },
      { path: 'invoices', element: <PortalInvoices /> },
      { path: 'invoices/:id', element: <PortalInvoices detail /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <NotFoundPage embedded /> },
    ] },
  ] },
  { path: '*', element: <NotFoundPage /> },
];
