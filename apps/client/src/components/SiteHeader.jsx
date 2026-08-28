import { useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useCart } from '../CartContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { visibleNavLinks } from './navLinks.js';
import { CATEGORIES } from '../data/categories.js';
import SiteDrawer from './SiteDrawer.jsx';

export default function SiteHeader() {
  const { backends, backendKey, selectBackend } = useBackend();
  const { items } = useCart();
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [term, setTerm] = useState('');

  const links = visibleNavLinks(user);
  const activeCategory = location.pathname === '/products' ? searchParams.get('category') || '' : null;
  const cartCount = items.reduce((n, i) => n + i.quantity, 0);

  function handleSearch(e) {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="site-header">
      <div className="site-header__util">
        <div className="site-header__util-inner">
          <span>백엔드 대상</span>
          <div className="segmented">
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
          <span className="site-header__util-spacer" />
          {user ? (
            <>
              <span>{user.username}님</span>
              <Link to="/mypage" className="link-plain">마이페이지</Link>
              <button
                type="button"
                onClick={handleLogout}
                className="link-plain"
                style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="link-plain">로그인</Link>
              <Link to="/signup" className="link-plain">회원가입</Link>
            </>
          )}
        </div>
      </div>

      <div className="site-header__bar">
        <button
          type="button"
          className="hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="메뉴 열기"
        >
          ☰
        </button>

        <Link to="/" className="site-header__brand">Vuln Shop</Link>

        <nav className="site-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'site-nav__link active' : 'site-nav__link')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <form className="site-header__search" onSubmit={handleSearch} role="search">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="어떤 상품을 찾으세요?"
            aria-label="상품 검색"
          />
          <button type="submit" aria-label="검색">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>

        <div className="site-header__actions">
          <Link to="/cart" className="icon-link" aria-label="장바구니">
            <span className="icon-link__glyph">🛒</span>
            {cartCount > 0 && <span className="count-badge">{cartCount}</span>}
          </Link>
        </div>
      </div>

      <nav className="category-nav" aria-label="카테고리">
        <div className="category-nav__inner">
          <Link
            to="/products"
            className={activeCategory === '' ? 'category-nav__link active' : 'category-nav__link'}
          >
            전체
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/products?category=${c.slug}`}
              className={activeCategory === c.slug ? 'category-nav__link active' : 'category-nav__link'}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </nav>

      <SiteDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
