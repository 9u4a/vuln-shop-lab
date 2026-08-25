import { Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom';
import { BackendProvider, useBackend } from './BackendContext.jsx';
import { CartProvider, useCart } from './CartContext.jsx';
import { SessionProvider, useSession } from './SessionContext.jsx';
import { ToastProvider } from './ToastContext.jsx';
import RequireAuth from './RequireAuth.jsx';
import RequireRole from './RequireRole.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import MyPageLayout from './pages/mypage/MyPageLayout.jsx';
import MyPageProfile from './pages/mypage/MyPageProfile.jsx';
import MyPagePassword from './pages/mypage/MyPagePassword.jsx';
import Cart from './pages/Cart.jsx';
import CheckoutResult from './pages/CheckoutResult.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Faq from './pages/Faq.jsx';
import Notices from './pages/Notices.jsx';
import NotFound from './pages/NotFound.jsx';
import Forbidden from './pages/Forbidden.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminFaq from './pages/admin/AdminFaq.jsx';
import AdminNotices from './pages/admin/AdminNotices.jsx';

const ADMIN_ROLES = ['admin', 'system_admin'];

function NavItem({ to, children }) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
      {children}
    </NavLink>
  );
}

function Layout({ children }) {
  const { backend, backends, backendKey, selectBackend } = useBackend();
  const { items } = useCart();
  const { user, logout } = useSession();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">Vuln Shop</Link>

          <nav className="main-nav">
            <NavItem to="/products">상품</NavItem>
            <NavItem to="/notices">공지사항</NavItem>
            <NavItem to="/cart">장바구니{items.length > 0 && <span className="count-badge">{items.length}</span>}</NavItem>
            {user && <NavItem to="/orders">주문 내역</NavItem>}
            <NavItem to="/faq">자주 묻는 질문</NavItem>
            {user && ADMIN_ROLES.includes(user.role) && <NavItem to="/admin">관리자</NavItem>}
          </nav>

          <div className="topbar-actions">
            <select
              className="backend-select"
              value={backendKey}
              onChange={(e) => selectBackend(e.target.value)}
              aria-label="Backend target"
            >
              {Object.entries(backends).map(([key, b]) => (
                <option key={key} value={key}>{b.label}</option>
              ))}
            </select>

            {user ? (
              <div className="account-area">
                <span className="greeting">{user.username}님</span>
                <Link to="/mypage" className="btn btn-ghost btn-sm">마이페이지</Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">로그아웃</button>
              </div>
            ) : (
              <div className="account-area">
                <Link to="/login" className="btn btn-ghost btn-sm">로그인</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">회원가입</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BackendProvider>
        <SessionProvider>
          <CartProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/notices" element={<Notices />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout/success" element={<CheckoutResult success />} />
                <Route path="/checkout/fail" element={<CheckoutResult success={false} />} />

                <Route path="/mypage" element={<RequireAuth><MyPageLayout /></RequireAuth>}>
                  <Route index element={<MyPageProfile />} />
                  <Route path="password" element={<MyPagePassword />} />
                </Route>
                <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />

                <Route
                  path="/admin"
                  element={
                    <RequireRole roles={ADMIN_ROLES}>
                      <AdminLayout />
                    </RequireRole>
                  }
                >
                  <Route index element={<Navigate to="settings" replace />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="faq" element={<AdminFaq />} />
                  <Route path="notices" element={<AdminNotices />} />
                </Route>

                <Route path="/forbidden" element={<Forbidden />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </CartProvider>
        </SessionProvider>
      </BackendProvider>
    </ToastProvider>
  );
}
