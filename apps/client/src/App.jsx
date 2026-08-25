import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BackendProvider, useBackend } from './BackendContext.jsx';
import { fetchSession, logout as apiLogout } from './api.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';

function Layout({ children }) {
  const { backend, backends, backendKey, selectBackend } = useBackend();
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
        <select value={backendKey} onChange={(e) => selectBackend(e.target.value)}>
          {Object.entries(backends).map(([key, b]) => (
            <option key={key} value={key}>{b.label}</option>
          ))}
        </select>
        {user ? (
          <>
            <span>Hi, {user.username}</span>
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
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
        </Routes>
      </Layout>
    </BackendProvider>
  );
}
