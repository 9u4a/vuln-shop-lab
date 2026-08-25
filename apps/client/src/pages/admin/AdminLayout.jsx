import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../../SessionContext.jsx';

const TABS = [
  { to: 'settings', label: 'Settings' },
  { to: 'users', label: 'Users' },
  { to: 'orders', label: 'Orders' },
  { to: 'products', label: 'Products' },
  { to: 'faq', label: 'FAQ' },
  { to: 'notices', label: 'Notices' },
];

export default function AdminLayout() {
  const { user } = useSession();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin</h1>
        <p className="muted">Signed in as <span className="badge">{user?.role}</span></p>
      </div>
      <nav className="admin-subnav">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
