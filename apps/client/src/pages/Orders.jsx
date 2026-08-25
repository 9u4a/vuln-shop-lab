import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrders } from '../api.js';
import { formatCurrency } from '../format.js';

export default function Orders() {
  const { backend } = useBackend();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders(backend.base)
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, [backend.base]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>주문 내역</h1>
      </div>
      {orders.length === 0 && <p className="muted">아직 주문이 없습니다.</p>}
      <ul className="product-grid">
        {orders.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`}>주문 #{o.id}</Link>
            <span className="badge">{o.status}</span>
            <div className="product-price">{formatCurrency(o.totalAmount)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
