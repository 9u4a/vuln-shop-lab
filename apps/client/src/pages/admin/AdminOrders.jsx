import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminOrders } from '../../api.js';
import { formatCurrency } from '../../format.js';

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
      <h2>주문</h2>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p className="muted">아직 주문이 없습니다.</p>}
      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            주문 #{o.id} — {o.username} — <span className="badge">{o.status}</span> — {formatCurrency(o.totalAmount)}
          </li>
        ))}
      </ul>
    </section>
  );
}
