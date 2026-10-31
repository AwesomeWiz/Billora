import { Activity, BarChart3, Bell, CreditCard, FileText, House, Layers3, LayoutDashboard, Receipt, Settings2, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { Role } from '../features/auth/contract';

export function navigationFor(role: Role) {
  if (role === 'CUSTOMER') return [
    { label: 'Home', to: '/portal/home', icon: House, available: true },
    { label: 'My subscriptions', to: '/portal/subscriptions', icon: Layers3, available: true },
    { label: 'My invoices', to: '/portal/invoices', icon: Receipt, available: true },
    { label: 'Account', to: '/portal/account', icon: Settings2, available: true },
  ];
  return [
    { label: 'Overview', to: '/app/overview', icon: LayoutDashboard, available: true },
    { label: 'Subscriptions', to: '/app/subscriptions', icon: Layers3, available: true },
    { label: 'Quotations', to: '/app/quotations', icon: FileText, available: true },
    { label: 'Invoices', to: '/app/invoices', icon: Receipt, available: true },
    { label: 'Payments', to: '/app/payments', icon: Wallet, available: false },
    { label: 'Customers', to: '/app/customers', icon: Users, available: true },
    { label: 'Products & Variants', to: '/app/catalog/products', icon: CreditCard, available: true },
    { label: 'Plans', to: '/app/catalog/plans', icon: CreditCard, available: true },
    ...(role === 'ADMIN' ? [{ label: 'Taxes', to: '/app/catalog/taxes', icon: FileText, available: true }] : []),
    { label: 'Discounts', to: '/app/catalog/discounts', icon: FileText, available: true },
    { label: 'Quotation Templates', to: '/app/quotation-templates', icon: FileText, available: true },
    { label: 'Reports', to: '/app/reports', icon: BarChart3, available: true },
    { label: 'Activity Timeline', to: '/app/activity', icon: Activity, available: true },
    { label: 'Notifications', to: '/app/notifications', icon: Bell, available: true },
  ];
}

export const adminNavigation = [
  { label: 'Staff', icon: ShieldCheck },
];
