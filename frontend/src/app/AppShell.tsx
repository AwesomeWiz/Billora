import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronRight, LogOut, Menu, PanelLeft, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '../components/ui';
import { useAuth } from '../features/auth/AuthProvider';
import { homeForRole } from '../features/auth/contract';
import { errorMessage } from '../lib/api';
import { Brand } from './Brand';
import { adminNavigation, navigationFor } from './navigation';

export function AppShell() {
  const { state, logout } = useAuth();
  const location = useLocation();
  const drawer = useRef<HTMLDialogElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  useEffect(() => { drawer.current?.close(); }, [location.pathname]);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (query.matches) drawer.current?.close(); };
    query.addEventListener('change', closeOnDesktop);
    return () => query.removeEventListener('change', closeOnDesktop);
  }, []);
  if (state.status !== 'authenticated') return null;
  const { user } = state;
  const links = navigationFor(user.role);
  const current = links.find(item => item.to === location.pathname);
  const initials = user.email.slice(0, 2).toUpperCase();

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError(null);
    try { await logout(); }
    catch (error) { setLogoutError(errorMessage(error)); }
    finally { setLoggingOut(false); }
  }

  function sidebar(mobile = false) {
    return <>
      <div className="sidebar-brand"><Brand to={homeForRole(user.role)} />{mobile && <Button variant="ghost" aria-label="Close navigation" onClick={() => drawer.current?.close()}><X size={20} /></Button>}</div>
      <div className="workspace-label"><span className="workspace-icon"><Building2 size={18} aria-hidden="true" /></span>
        <div><strong>{user.role === 'CUSTOMER' ? 'Customer workspace' : 'Brightloop Software'}</strong><span>{user.role === 'CUSTOMER' ? 'Your billing account' : 'Subscription operations'}</span></div>
      </div>
      <nav aria-label={mobile ? 'Mobile navigation' : 'Main navigation'} className="sidebar-navigation">
        <p className="nav-section-label">WORKSPACE</p>
        {links.map(({ label, to, icon: Icon, available }) => available
          ? <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} aria-hidden="true" />{label}</NavLink>
          : <span key={to} className="nav-item unavailable" aria-disabled="true" title="Scheduled for the next implementation phase"><Icon size={18} aria-hidden="true" />{label}<span className="nav-next">Next</span></span>)}
        {user.role === 'ADMIN' && <><p className="nav-section-label configuration-label">CONFIGURATION</p>{adminNavigation.map(({ label, icon: Icon }) =>
          <span key={label} className="nav-item unavailable" aria-disabled="true" title="Awaiting the configuration module"><Icon size={18} aria-hidden="true" />{label}<span className="nav-next">Next</span></span>)}</>}
      </nav>
      <div className="sidebar-footer"><div className="avatar">{initials}</div><div className="sidebar-user"><strong title={user.email}>{user.email}</strong><span>{user.role === 'ADMIN' ? 'Administrator' : user.role === 'STAFF' ? 'Staff member' : 'Customer'}</span></div>
        <Button variant="ghost" aria-label="Sign out" loading={loggingOut} disabled={loggingOut} onClick={() => void signOut()}><LogOut size={17} aria-hidden="true" /></Button>
      </div>
    </>;
  }

  return <div className="app-layout">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">{sidebar()}</aside>
    <dialog className="mobile-drawer" ref={drawer} aria-label="Workspace navigation" onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}>
      <div className="drawer-body">{sidebar(true)}</div>
    </dialog>
    <div className="app-main">
      <header className="topbar">
        <div className="topbar-context"><Button variant="ghost" className="mobile-menu" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}><Menu size={20} aria-hidden="true" /></Button>
          <PanelLeft className="desktop-context-icon" size={17} aria-hidden="true" /><span className="muted">Workspace</span><ChevronRight size={14} aria-hidden="true" /><span>{current?.label ?? 'Page'}</span>
        </div>
        <div className="topbar-user"><span className="role-label">{user.role === 'CUSTOMER' ? 'Customer portal' : user.role === 'ADMIN' ? 'Admin workspace' : 'Staff workspace'}</span><div className="avatar small">{initials}</div></div>
      </header>
      <main id="main-content" className="page-content" tabIndex={-1}>
        {logoutError && <div className="notice notice-error" role="alert">Sign-out could not be confirmed. {logoutError}<Button variant="secondary" onClick={() => void signOut()} loading={loggingOut}>Retry sign out</Button></div>}
        <Outlet />
      </main>
      <footer className="app-footer"><span>Billora</span><span>Subscription operations, with clarity.</span></footer>
    </div>
  </div>;
}
