import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminOrders, fetchAdminOrder } from '../../api.js';
import { formatCurrency } from '../../format.js';
import StatusChip from '../../components/StatusChip.jsx';

export default function AdminOrders() {
  const { backend } = useBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setError(null);
    fetchAdminOrders(backend.base).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [backend.base]);

  useEffect(() => {
    const want = searchParams.get('open');
    if (want) open(Number(want));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.base, searchParams]);

  async function open(id) {
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminOrder(backend.base, id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function toggle(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      if (searchParams.get('open')) setSearchParams({});
    } else {
      open(id);
    }
  }

  return (
    <section className="card">
      <h2>주문 <span className="muted">({orders.length})</span></h2>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p className="muted">아직 주문이 없습니다.</p>}

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>주문번호</th>
              <th>주문자</th>
              <th>상태</th>
              <th className="tnum">결제금액</th>
              <th>주문일</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="row-toggle" onClick={() => toggle(o.id)}>
                <td>#{o.id}</td>
                <td>{o.username}</td>
                <td><StatusChip status={o.status} /></td>
                <td className="tnum">{formatCurrency(o.totalAmount)}</td>
                <td>{(o.createdAt || o.created_at || '').slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId != null && (
        <div className="admin-detail">
          {detailLoading && <p className="muted">불러오는 중...</p>}
          {detail && (
            <>
              <dl>
                <dt>주문번호</dt><dd>#{detail.order.id}</dd>
                <dt>Toss 주문 ID</dt><dd>{detail.order.tossOrderId || '-'}</dd>
                <dt>주문자</dt><dd>{detail.order.username}</dd>
                <dt>상태</dt><dd><StatusChip status={detail.order.status} /></dd>
                <dt>주문일</dt><dd>{detail.order.createdAt || '-'}</dd>
              </dl>
              <h4>주문 상품 ({detail.items.length})</h4>
              <ul className="line-list">
                {detail.items.map((i, idx) => (
                  <li key={idx} className="line-item">
                    <div className="line-item__main">
                      <span className="line-item__name">{i.productName}</span>
                      {i.optionValue && <span className="line-item__meta">옵션: {i.optionValue}</span>}
                      <span className="line-item__meta tnum">{i.quantity}개 · {formatCurrency(i.unitPrice)}</span>
                    </div>
                    <span className="line-item__price tnum">{formatCurrency(i.unitPrice * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="summary-box__row summary-box__row--total" style={{ marginTop: 'var(--space-3)' }}>
                <span>합계</span><span className="tnum">{formatCurrency(detail.order.totalAmount)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
