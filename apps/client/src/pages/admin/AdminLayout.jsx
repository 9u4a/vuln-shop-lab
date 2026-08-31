import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../../SessionContext.jsx';

const TABS = [
  { to: 'settings', label: '설정' },
  { to: 'users', label: '사용자' },
  { to: 'logs', label: '접속 로그' },
  { to: 'orders', label: '주문' },
  { to: 'products', label: '상품' },
  { to: 'faq', label: 'FAQ' },
  { to: 'notices', label: '공지사항' },
  { to: 'events', label: '이벤트' },
  { to: 'coupons', label: '쿠폰' },
  { to: 'returns', label: '반품/환불' },
  { to: 'restock', label: '재입고 알림' },
];

export default function AdminLayout() {
  const { user } = useSession();

  return (
    <div className="page">
      <div className="page-header">
        <h1>관리자</h1>
        <p className="muted">로그인 계정: <span className="badge">{user?.role}</span></p>
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
