import { Routes, Route, Link, useNavigate } from 'react-router-dom';
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
    <div>
      <nav>
        <Link to="/">Vuln Shop</Link>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart ({items.length})</Link>
        {user && <Link to="/orders">Orders</Link>}
        <select value={backendKey} onChange={(e) => selectBackend(e.target.value)}>
          {Object.entries(backends).map(([key, b]) => (
            <option key={key} value={key}>{b.label}</option>
          ))}
        </select>
        {user ? (
          <>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <Link to="/profile">Hi, {user.username}</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </nav>
      <main>{children}</main>
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
