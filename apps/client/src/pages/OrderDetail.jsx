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
    <div>
      <h1>Order #{data.order.id}</h1>
      <p>Status: {data.order.status}</p>
      <p>Total: ${Number(data.order.totalAmount).toFixed(2)}</p>
      <ul className="product-grid">
        {data.items.map((i) => (
          <li key={i.productId}>
            <div>{i.productName}</div>
            <div>{i.quantity} x ${Number(i.unitPrice).toFixed(2)}</div>
          </li>
        ))}
      </ul>
      <Link to="/orders">Back to orders</Link>
    </div>
  );
}
