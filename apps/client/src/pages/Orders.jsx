import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrders } from '../api.js';
import { formatCurrency } from '../format.js';
import StatusChip from '../components/StatusChip.jsx';
import EmptyState from '../components/EmptyState.jsx';

function orderTitle(o) {
  if (!o.itemSummary) return `주문 #${o.id}`;
  return o.itemCount > 1 ? `${o.itemSummary} 외 ${o.itemCount - 1}건` : o.itemSummary;
}

function displayStatus(o) {
  return o.status === 'paid' && o.shipmentStatus ? o.shipmentStatus : o.status;
}

export default function Orders() {
  const { backend } = useBackend();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setOrders(null);
    fetchOrders(backend.base)
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err.message));
  }, [backend.base]);

  function inquire(o) {
    navigate('/qna', {
      state: {
        openForm: true,
        prefill: {
          title: `[주문 #${o.id}] 문의`,
          body: `주문 #${o.id} 관련하여 문의드립니다.\n\n`,
          secret: true,
        },
      },
    });
  }

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
        <ul className="order-cards">
          {orders.map((o) => (
            <li key={o.id} className="order-card">
              <div className="order-card__head">
                <Link to={`/orders/${o.id}`} className="order-card__title">{orderTitle(o)}</Link>
                <StatusChip status={displayStatus(o)} />
              </div>
              <div className="order-card__meta">
                <span className="muted">주문 #{o.id} · {(o.createdAt || '').slice(0, 10)}</span>
                <span className="order-card__amount tnum">{formatCurrency(o.totalAmount)}</span>
              </div>
              <div className="order-card__actions">
                <Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">상세</Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/orders/${o.id}`)}>반품/환불</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => inquire(o)}>문의</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
