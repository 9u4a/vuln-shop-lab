import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { useSession } from '../../SessionContext.jsx';
import { fetchAdminUsers, fetchAdminOrders, fetchProducts, fetchFaqs, fetchNotices } from '../../api.js';

export default function AdminSettings() {
  const { backend } = useBackend();
  const { user } = useSession();
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCounts(null);
    setError(null);
    Promise.all([
      fetchAdminUsers(backend.base),
      fetchAdminOrders(backend.base),
      fetchProducts(backend.base),
      fetchFaqs(backend.base),
      fetchNotices(backend.base),
    ])
      .then(([users, orders, products, faqs, notices]) => {
        setCounts({
          users: users.users.length,
          orders: orders.orders.length,
          products: products.products.length,
          faqs: faqs.faqs.length,
          notices: notices.notices.length,
        });
      })
      .catch((err) => setError(err.message));
  }, [backend.base]);

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Overview</h2>
        {!counts ? (
          <p className="muted">Loading...</p>
        ) : (
          <ul>
            <li>Users: {counts.users}</li>
            <li>Orders: {counts.orders}</li>
            <li>Products: {counts.products}</li>
            <li>FAQs: {counts.faqs}</li>
            <li>Notices: {counts.notices}</li>
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Role tiers</h2>
        <ul>
          <li><span className="badge">user</span> — browse, cart, orders, reviews, own profile.</li>
          <li><span className="badge">admin</span> — everything a user can do, plus products/FAQ/notices management and viewing users/orders.</li>
          <li><span className="badge">system_admin</span> — everything an admin can do, plus changing user roles.</li>
        </ul>
        {user?.role !== 'system_admin' && (
          <p className="muted">You're signed in as <strong>{user?.role}</strong> — role changes on the Users tab are System Admin only.</p>
        )}
      </section>
    </div>
  );
}
