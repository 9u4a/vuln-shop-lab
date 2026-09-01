import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchSharedOrder } from '../api.js';
import { formatCurrency } from '../format.js';
import StatusChip from '../components/StatusChip.jsx';

export default function SharedOrder() {
  const { backend } = useBackend();
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchSharedOrder(backend.base, token)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [backend.base, token]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">불러오는 중...</p></div>;

  const { order, items, shipment } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          주문 #{order.id} <StatusChip status={order.status} />
        </h1>
        <p className="muted">공유된 주문 상태 페이지입니다.</p>
      </div>

      <section className="card">
        <ul className="line-list">
          {items.map((i) => (
            <li key={i.id ?? `${i.productId}::${i.optionValue || ''}`} className="line-item">
              <div className="line-item__main">
                <span className="line-item__name">상품 #{i.productId}</span>
                {i.optionValue && <span className="line-item__meta">옵션: {i.optionValue}</span>}
                <span className="line-item__meta tnum">{i.quantity}개 · {formatCurrency(i.unitPrice)}</span>
              </div>
            </li>
          ))}
        </ul>
        {order.discountAmount > 0 && (
          <div className="summary-box__row"><span>쿠폰 할인</span><span className="tnum">-{formatCurrency(order.discountAmount)}</span></div>
        )}
        <div className="summary-box__row summary-box__row--total" style={{ marginTop: 'var(--space-4)' }}>
          <span>총 결제금액</span><span className="tnum">{formatCurrency(order.totalAmount)}</span>
        </div>
      </section>

      {(order.shipping || shipment) && (
        <section className="card">
          <h2>배송</h2>
          {order.shipping && (
            <p className="muted" style={{ whiteSpace: 'pre-line' }}>
              {order.shipping.name} · {order.shipping.phone}
              {'\n'}({order.shipping.postcode}) {order.shipping.address} {order.shipping.addressDetail || ''}
            </p>
          )}
          {shipment && (
            <p><StatusChip status={shipment.status} /> {shipment.carrier} · 송장번호 {shipment.trackingNo}</p>
          )}
        </section>
      )}

      <p><Link to="/" className="muted">&larr; 홈으로</Link></p>
    </div>
  );
}
