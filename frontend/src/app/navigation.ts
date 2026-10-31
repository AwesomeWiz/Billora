import { BarChart3, CreditCard, FileText, House, Layers3, LayoutDashboard, Receipt, Settings2, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { Role } from '../features/auth/contract';

export function navigationFor(role: Role) {
  if (role === 'CUSTOMER') return [
    { label: 'Home', to: '/portal/home', icon: House, available: true },
    { label: 'My subscriptions', to: '/portal/subscriptions', icon: Layers3, available: false },
    { label: 'My invoices', to: '/portal/invoices', icon: Receipt, available: false },
    { label: 'Account', to: '/portal/account', icon: Settings2, available: true },
  ];
  return [
    { label: 'Overview', to: '/app/overview', icon: LayoutDashboard, available: true },
    { label: 'Subscriptions', to: '/app/subscriptions', icon: Layers3, available: true },
    { label: 'Invoices', to: '/app/invoices', icon: Receipt, available: true },
    { label: 'Payments', to: '/app/payments', icon: Wallet, available: false },
    { label: 'Customers', to: '/app/customers', icon: Users, available: true },
    { label: 'Reports', to: '/app/reports', icon: BarChart3, available: false },
  ];
}

export const adminNavigation = [
  { label: 'Products & plans', icon: CreditCard }, { label: 'Taxes & discounts', icon: FileText }, { label: 'Staff', icon: ShieldCheck },
];
