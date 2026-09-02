import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminOrders, fetchAdminOrder, updateOrderStatus, setOrderShipment } from '../../api.js';
import { formatCurrency } from '../../format.js';
import StatusChip from '../../components/StatusChip.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const STATUSES = ['pending', 'paid', 'failed', 'cancelled'];
const PAGE_SIZE = 10;

export default function AdminOrders() {
  const { backend } = useBackend();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusDraft, setStatusDraft] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [carrierDraft, setCarrierDraft] = useState('CJ대한통운');
  const [shipMsg, setShipMsg] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    setError(null);
    fetchAdminOrders(backend.base).then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  useEffect(() => {
    const want = searchParams.get('open');
    if (want) open(Number(want));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend.base, searchParams]);

  const q = query.trim().toLowerCase();
  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (!q) return true;
    return String(o.id).includes(q) || (o.username || '').toLowerCase().includes(q) || (o.status || '').toLowerCase().includes(q);
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function open(id) {
    setOpenId(id);
    setDetail(null);
    setSaveStatus(null);
    setDetailLoading(true);
    try {
      const d = await fetchAdminOrder(backend.base, id);
      setDetail(d);
      setStatusDraft(d.order.status);
      setShipMsg(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setOpenId(null);
    setDetail(null);
    if (searchParams.get('open')) setSearchParams({});
  }

  async function handleSaveStatus() {
    setSaveStatus(null);
    try {
      await updateOrderStatus(backend.base, openId, statusDraft);
      setSaveStatus('상태가 변경되었습니다.');
      setDetail((d) => ({ ...d, order: { ...d.order, status: statusDraft } }));
      load();
    } catch (err) {
      setSaveStatus(err.message);
    }
  }

  async function handleRegisterShipment() {
    setShipMsg(null);
    try {
      const s = await setOrderShipment(backend.base, openId, carrierDraft);
      setShipMsg(`송장번호 ${s.trackingNo} 등록됨`);
      setDetail((d) => ({ ...d, shipment: s }));
    } catch (err) {
      setShipMsg(err.message);
    }
  }

  return (
    <section className="card">
      <div className="admin-toolbar">
        <h2>주문 <span className="muted">({orders.length})</span></h2>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="주문번호·주문자·상태 검색"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">전체 상태</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p className="muted">아직 주문이 없습니다.</p>}

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr><th>주문번호</th><th>주문자</th><th>상태</th><th className="tnum">결제금액</th><th>주문일</th></tr>
          </thead>
          <tbody>
            {paged.map((o) => (
              <tr key={o.id} className="row-toggle" onClick={() => open(o.id)}>
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

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      <Modal open={openId != null} title="주문 상세" onClose={closeModal} wide>
        {detailLoading && <p className="muted">불러오는 중...</p>}
        {detail && (
          <>
            <dl className="admin-detail-dl">
              <dt>주문번호</dt><dd>#{detail.order.id}</dd>
              <dt>Toss 주문 ID</dt><dd>{detail.order.tossOrderId || '-'}</dd>
              <dt>주문자</dt><dd>{detail.order.username}</dd>
              <dt>주문일</dt><dd>{detail.order.createdAt || '-'}</dd>
            </dl>

            <div className="order-status-edit">
              <label>상태 변경
                <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveStatus} disabled={statusDraft === detail.order.status}>
                상태 저장
              </button>
              {saveStatus && <span className={saveStatus === '상태가 변경되었습니다.' ? 'status-ok' : 'error'}>{saveStatus}</span>}
            </div>

            <div className="order-status-edit">
              <label>택배사
                <input value={carrierDraft} onChange={(e) => setCarrierDraft(e.target.value)} />
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleRegisterShipment}>
                {detail.shipment ? '송장 수정' : '송장 등록'}
              </button>
              {detail.shipment && <span className="muted">현재: {detail.shipment.carrier} / {detail.shipment.trackingNo}</span>}
              {shipMsg && <span className={shipMsg.includes('등록됨') ? 'status-ok' : 'error'}>{shipMsg}</span>}
            </div>

            {detail.order.shipping && (
              <p className="muted admin-detail-ship">
                배송지: {detail.order.shipping.name} · {detail.order.shipping.phone} · ({detail.order.shipping.postcode}) {detail.order.shipping.address} {detail.order.shipping.addressDetail || ''}
              </p>
            )}

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
      </Modal>
    </section>
  );
}
