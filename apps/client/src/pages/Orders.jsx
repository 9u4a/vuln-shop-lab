import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrders } from '../api.js';
import { formatCurrency } from '../format.js';
import StatusChip from '../components/StatusChip.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Orders() {
  const { backend } = useBackend();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOrders(null);
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
      {orders === null ? (
        <p className="muted">불러오는 중...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          emoji="📦"
          title="주문 내역이 없어요"
          description="첫 주문을 시작해보세요."
          action={<Link to="/products" className="btn btn-primary">상품 둘러보기</Link>}
        />
      ) : (
        <ul className="order-list">
          {orders.map((o) => (
            <li key={o.id} className="order-row">
              <Link to={`/orders/${o.id}`} className="order-row__id">주문 #{o.id}</Link>
              <StatusChip status={o.status} />
              <span className="order-row__amount tnum">{formatCurrency(o.totalAmount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
