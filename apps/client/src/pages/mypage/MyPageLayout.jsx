import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '', label: '프로필', end: true },
  { to: 'likes', label: '찜한 상품' },
  { to: 'addresses', label: '배송지 관리' },
  { to: 'rewards', label: '포인트·추천' },
  { to: 'qna', label: '내 Q&A' },
  { to: 'api-token', label: 'API 토큰' },
  { to: 'password', label: '비밀번호 변경' },
];

export default function MyPageLayout() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>마이페이지</h1>
        <p className="muted">계정, 프로필 정보, 비밀번호를 관리하세요.</p>
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
