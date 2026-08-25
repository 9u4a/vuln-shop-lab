import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrders } from '../api.js';

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
    <div>
      <h1>My Orders</h1>
      {orders.length === 0 && <p>No orders yet.</p>}
      <ul className="product-grid">
        {orders.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`}>Order #{o.id}</Link>
            <div>Status: {o.status}</div>
            <div>${Number(o.totalAmount).toFixed(2)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
