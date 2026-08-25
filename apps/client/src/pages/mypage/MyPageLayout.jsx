import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '', label: 'Profile', end: true },
  { to: 'password', label: 'Change Password' },
];

export default function MyPageLayout() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>My Page</h1>
        <p className="muted">Manage your account, profile info, and password.</p>
      </div>
      <nav className="admin-subnav">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
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
