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
import Profile from './pages/Profile.jsx';
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
            <NavItem to="/products">Products</NavItem>
            <NavItem to="/faq">FAQ</NavItem>
            <NavItem to="/notices">Notices</NavItem>
            <NavItem to="/cart">Cart{items.length > 0 && <span className="count-badge">{items.length}</span>}</NavItem>
            {user && <NavItem to="/orders">My Orders</NavItem>}
            {user && ADMIN_ROLES.includes(user.role) && <NavItem to="/admin">Admin</NavItem>}
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
                <span className="greeting">Hi, {user.username}</span>
                <Link to="/profile" className="btn btn-ghost btn-sm">My Page</Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button>
              </div>
            ) : (
              <div className="account-area">
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
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

                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
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
