import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrder } from '../api.js';
import { formatCurrency } from '../format.js';

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
  if (!data) return <p>불러오는 중...</p>;

  return (
    <div className="page">
      <Link to="/orders" className="muted">&larr; 주문 내역으로</Link>
      <div className="page-header">
        <h1>주문 #{data.order.id}</h1>
        <span className="badge">{data.order.status}</span>
      </div>
      <section className="card">
        <p><strong>총액: {formatCurrency(data.order.totalAmount)}</strong></p>
        <ul className="product-grid">
          {data.items.map((i) => (
            <li key={`${i.productId}::${i.optionValue || ''}`}>
              <div>{i.productName}</div>
              {i.optionValue && <div className="muted">옵션: {i.optionValue}</div>}
              <div className="muted">{i.quantity}개 x {formatCurrency(i.unitPrice)}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
