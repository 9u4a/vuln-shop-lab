import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BackendProvider, useBackend } from './BackendContext.jsx';
import { CartProvider, useCart } from './CartContext.jsx';
import { fetchSession, logout as apiLogout } from './api.js';
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
import Admin from './pages/Admin.jsx';

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
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSession(backend.base)
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, [backend.base]);

  async function handleLogout() {
    await apiLogout(backend.base);
    setUser(null);
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">Vuln Shop</Link>

          <nav className="main-nav">
            <NavItem to="/products">Products</NavItem>
            <NavItem to="/cart">Cart{items.length > 0 && <span className="count-badge">{items.length}</span>}</NavItem>
            {user && <NavItem to="/orders">My Orders</NavItem>}
            {user?.role === 'admin' && <NavItem to="/admin">Admin</NavItem>}
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
    <BackendProvider>
      <CartProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout/success" element={<CheckoutResult success />} />
            <Route path="/checkout/fail" element={<CheckoutResult success={false} />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Layout>
      </CartProvider>
    </BackendProvider>
  );
}
