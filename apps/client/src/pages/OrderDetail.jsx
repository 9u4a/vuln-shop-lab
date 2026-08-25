import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrder } from '../api.js';

export default function OrderDetail() {
  const { backend } = useBackend();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchOrder(backend.base, id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [backend.base, id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div className="page">
      <Link to="/orders" className="muted">&larr; Back to orders</Link>
      <div className="page-header">
        <h1>Order #{data.order.id}</h1>
        <span className="badge">{data.order.status}</span>
      </div>
      <section className="card">
        <p><strong>Total: ${Number(data.order.totalAmount).toFixed(2)}</strong></p>
        <ul className="product-grid">
          {data.items.map((i) => (
            <li key={i.productId}>
              <div>{i.productName}</div>
              <div className="muted">{i.quantity} x ${Number(i.unitPrice).toFixed(2)}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
