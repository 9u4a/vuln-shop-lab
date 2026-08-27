import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { visibleNavLinks } from './navLinks.js';

export default function SiteDrawer({ open, onClose }) {
  const { backends, backendKey, selectBackend } = useBackend();
  const { user, logout } = useSession();
  const location = useLocation();

  useEffect(() => { onClose(); }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const links = visibleNavLinks(user);

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="drawer__head">
          <Link to="/" className="site-header__brand" onClick={onClose}>Vuln Shop</Link>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="닫기">&times;</button>
        </div>

        {links.map((l) => (
          <Link key={l.to} to={l.to} className="drawer__link">{l.label}</Link>
        ))}

        <p className="drawer__section-label">계정</p>
        {user ? (
          <>
            <Link to="/mypage" className="drawer__link">마이페이지 ({user.username})</Link>
            <button
              type="button"
              className="drawer__link"
              style={{ textAlign: 'left', background: 'none', width: '100%' }}
              onClick={() => { logout(); onClose(); }}
            >
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="drawer__link">로그인</Link>
            <Link to="/signup" className="drawer__link">회원가입</Link>
          </>
        )}

        <p className="drawer__section-label">백엔드 대상</p>
        <div className="segmented" style={{ alignSelf: 'flex-start' }}>
          {Object.entries(backends).map(([key, b]) => (
            <button
              key={key}
              type="button"
              className={key === backendKey ? 'active' : ''}
              onClick={() => selectBackend(key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
