import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  History,
  LayoutDashboard,
  Menu,
  ScanText,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { ErrorNotice } from './Common';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/analyzer', label: 'Message analyzer', icon: ScanText },
  { to: '/history', label: 'Classification history', icon: History },
  { to: '/metrics', label: 'Model metrics', icon: ChartNoAxesCombined },
  { to: '/about', label: 'About Spamira', icon: CircleHelp },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  async function logout() {
    setSigningOut(true);
    setLogoutError('');
    try {
      await auth.logout();
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : 'Unable to sign out. Please try again.',
      );
    } finally {
      setSigningOut(false);
    }
  }
  const { pathname } = useLocation();
  const current =
    navigation.find((item) => item.to === pathname)?.label ||
    (pathname === '/login'
      ? 'Sign in'
      : pathname === '/register'
        ? 'Create account'
        : 'Page not found');
  return (
    <div className="app-shell">
      {open && (
        <button
          aria-label="Close navigation"
          className="nav-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="workspace-navigation" className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-symbol">
            <ShieldCheck size={25} />
          </span>
          spamira<span className="brand-dot">.</span>
        </NavLink>
        <div className="workspace">
          <span className="workspace-avatar">S</span>
          <div>
            <strong title={auth.user?.displayName}>
              {auth.user?.displayName || 'Guest workspace'}
            </strong>
            <small>{auth.user ? 'Your private workspace' : '10 free analyses daily'}</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19} />
              <span>{label}</span>
              {pathname === to && <span className="active-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="small-icon">
              <Activity size={20} />
            </span>
            <h3>
              A little clarity.
              <br />A lot less noise.
            </h3>
            <p>Understand what’s in your inbox, one message at a time.</p>
            <NavLink to="/about" onClick={() => setOpen(false)}>
              Meet the model <ArrowUpRight size={15} />
            </NavLink>
          </div>
          <div className="sidebar-footer">
            <ShieldCheck size={15} />
            <span>Spamira / v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="workspace-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            {auth.user ? (
              <>
                <span className="workspace-tag">PRIVATE WORKSPACE</span>
                <div
                  className="profile-avatar"
                  title={auth.user.displayName}
                  aria-label={auth.user.displayName}
                >
                  {auth.user.displayName.slice(0, 1).toUpperCase()}
                </div>
                <button
                  className="sign-out-button"
                  onClick={() => void logout()}
                  disabled={signingOut}
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                  <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="header-sign-in">
                  Sign in
                </Link>
                <Link to="/register" className="button primary header-register">
                  Create account
                </Link>
              </>
            )}
          </div>
        </header>
        <main id="main-content">
          {logoutError && <ErrorNotice message={logoutError} />}
          <Outlet key={auth.user?.id || 'guest'} />
        </main>
        <footer className="page-footer">
          <span>Spamira. Clarity in every message.</span>
          <span>TF-IDF + Logistic Regression</span>
        </footer>
      </div>
    </div>
  );
}
