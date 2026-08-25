import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminOrders } from '../../api.js';

export default function AdminOrders() {
  const { backend } = useBackend();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    fetchAdminOrders(backend.base).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [backend.base]);

  return (
    <section className="card">
      <h2>Orders</h2>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p className="muted">No orders yet.</p>}
      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            Order #{o.id} — {o.username} — <span className="badge">{o.status}</span> — ${Number(o.totalAmount).toFixed(2)}
          </li>
        ))}
      </ul>
    </section>
  );
}
