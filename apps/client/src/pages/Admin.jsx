import { useEffect, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import {
  fetchAdminUsers,
  updateUserRole,
  fetchAdminOrders,
  fetchProducts,
  createProductAdmin,
  deleteProductAdmin,
  fetchFaqs,
  createFaqAdmin,
  deleteFaqAdmin,
} from '../api.js';

const emptyProduct = { name: '', description: '', price: '', imageUrl: '', category: '' };
const emptyFaq = { question: '', answer: '' };

export default function Admin() {
  const { backend } = useBackend();
  const { user } = useSession();
  const isSystemAdmin = user?.role === 'system_admin';
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [newFaq, setNewFaq] = useState(emptyFaq);
  const [error, setError] = useState(null);

  function loadAll() {
    setError(null);
    fetchAdminUsers(backend.base).then((d) => setUsers(d.users)).catch((e) => setError(e.message));
    fetchAdminOrders(backend.base).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
    fetchProducts(backend.base).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
    fetchFaqs(backend.base).then((d) => setFaqs(d.faqs)).catch((e) => setError(e.message));
  }

  useEffect(loadAll, [backend.base]);

  async function handleRoleChange(userId, role) {
    try {
      await updateUserRole(backend.base, userId, role);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    try {
      await createProductAdmin(backend.base, { ...newProduct, price: Number(newProduct.price) });
      setNewProduct(emptyProduct);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteProduct(id) {
    try {
      await deleteProductAdmin(backend.base, id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateFaq(e) {
    e.preventDefault();
    try {
      await createFaqAdmin(backend.base, newFaq.question, newFaq.answer);
      setNewFaq(emptyFaq);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFaq(id) {
    try {
      await deleteFaqAdmin(backend.base, id);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin</h1>
        <p className="muted">Signed in as <span className="badge">{user?.role}</span></p>
      </div>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Users</h2>
        {!isSystemAdmin && <p className="muted">Only System Admins can change roles.</p>}
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              {u.username} <span className="badge">{u.role}</span>
              {isSystemAdmin ? (
                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="system_admin">system_admin</option>
                </select>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Orders</h2>
        {orders.length === 0 && <p className="muted">No orders yet.</p>}
        <ul>
          {orders.map((o) => (
            <li key={o.id}>
              Order #{o.id} — {o.username} — <span className="badge">{o.status}</span> — ${Number(o.totalAmount).toFixed(2)}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Products</h2>
        <ul className="product-grid">
          {products.map((p) => (
            <li key={p.id}>
              <div>{p.name}</div>
              <div className="product-price">${Number(p.price).toFixed(2)}</div>
              <button onClick={() => handleDeleteProduct(p.id)}>Delete</button>
            </li>
          ))}
        </ul>
        <h2>Add product</h2>
        <form onSubmit={handleCreateProduct}>
          <label>Name
            <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
          </label>
          <label>Description
            <input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
          </label>
          <label>Price
            <input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} required />
          </label>
          <label>Image URL
            <input value={newProduct.imageUrl} onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })} />
          </label>
          <label>Category
            <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
          </label>
          <button type="submit" className="btn btn-primary">Add product</button>
        </form>
      </section>

      <section className="card">
        <h2>FAQ</h2>
        <ul>
          {faqs.map((f) => (
            <li key={f.id}>
              <strong>{f.question}</strong> — {f.answer}
              <button onClick={() => handleDeleteFaq(f.id)}>Delete</button>
            </li>
          ))}
        </ul>
        <h2>Add FAQ</h2>
        <form onSubmit={handleCreateFaq}>
          <label>Question
            <input value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} required />
          </label>
          <label>Answer
            <textarea value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} rows="3" required />
          </label>
          <button type="submit" className="btn btn-primary">Add FAQ</button>
        </form>
      </section>
    </div>
  );
}
