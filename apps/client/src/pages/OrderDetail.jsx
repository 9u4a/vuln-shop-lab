import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrder, generateReceipt, fetchReceipt, requestReturn } from '../api.js';
import { formatCurrency } from '../format.js';
import StatusChip from '../components/StatusChip.jsx';
import ShipmentTimeline from '../components/ShipmentTimeline.jsx';

export default function OrderDetail() {
  const { backend } = useBackend();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [filename, setFilename] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnMsg, setReturnMsg] = useState(null);

  async function handleRequestReturn(e) {
    e.preventDefault();
    setReturnMsg(null);
    try {
      await requestReturn(backend.base, data.order.id, returnReason);
      setReturnReason('');
      setReturnMsg('반품/환불 요청이 접수되었습니다. 관리자 승인 후 처리됩니다.');
    } catch (err) {
      setReturnMsg(err.message);
    }
  }

  function inquire() {
    navigate('/qna', {
      state: {
        openForm: true,
        prefill: {
          title: `[주문 #${data.order.id}] 문의`,
          body: `주문 #${data.order.id} 관련하여 문의드립니다.\n\n`,
          secret: true,
        },
      },
    });
  }

  useEffect(() => {
    setData(null);
    setError(null);
    fetchOrder(backend.base, id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [backend.base, id]);

  async function handleGenerateReceipt(e) {
    e.preventDefault();
    setError(null);
    try {
      const res = await generateReceipt(backend.base, id, note);
      setFilename(res.filename);
      setReceipt(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDownloadReceipt(e) {
    e.preventDefault();
    setError(null);
    try {
      const text = await fetchReceipt(backend.base, filename);
      setReceipt(text);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">불러오는 중...</p>;

  return (
    <div className="page">
      <p><Link to="/orders" className="muted">&larr; 주문 내역으로</Link></p>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          주문 #{data.order.id} <StatusChip status={data.order.status} />
        </h1>
      </div>

      <section className="card">
        <ul className="line-list">
          {data.items.map((i) => (
            <li key={`${i.productId}::${i.optionValue || ''}`} className="line-item">
              <div className="line-item__main">
                <span className="line-item__name">{i.productName}</span>
                {i.optionValue && <span className="line-item__meta">옵션: {i.optionValue}</span>}
                <span className="line-item__meta tnum">{i.quantity}개 · {formatCurrency(i.unitPrice)}</span>
              </div>
              <span className="line-item__price tnum">{formatCurrency(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        {data.order.discountAmount > 0 && (
          <div className="summary-box__row"><span>쿠폰 할인</span><span className="tnum">-{formatCurrency(data.order.discountAmount)}</span></div>
        )}
        <div className="summary-box__row summary-box__row--total" style={{ marginTop: 'var(--space-4)' }}>
          <span>총 결제금액</span><span className="tnum">{formatCurrency(data.order.totalAmount)}</span>
        </div>
      </section>

      {data.order.shipping && (
        <section className="card">
          <h2>배송지</h2>
          <p className="muted" style={{ whiteSpace: 'pre-line' }}>
            {data.order.shipping.name} · {data.order.shipping.phone}
            {'\n'}({data.order.shipping.postcode}) {data.order.shipping.address} {data.order.shipping.addressDetail || ''}
          </p>
        </section>
      )}

      <section className="card">
        <h2>배송 조회</h2>
        <ShipmentTimeline shipment={data.shipment} />
      </section>

      {data.order.shareToken && (
        <section className="card">
          <h2>주문 공유</h2>
          <p className="muted">로그인 없이 주문·배송 상태를 확인할 수 있는 링크입니다.</p>
          <input
            readOnly
            value={`${window.location.origin}/orders/shared/${data.order.shareToken}`}
            onFocus={(e) => e.target.select()}
            style={{ width: '100%' }}
          />
        </section>
      )}

      <section className="card">
        <div className="card__header-row">
          <h2>반품/환불 · 문의</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={inquire}>이 주문 문의하기</button>
        </div>
        <form onSubmit={handleRequestReturn}>
          <label>반품/환불 사유
            <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="반품 사유를 입력하세요" />
          </label>
          <button type="submit" className="btn btn-ghost">반품/환불 요청</button>
        </form>
        {returnMsg && <p className="status-ok">{returnMsg}</p>}
      </section>

      <section className="card">
        <h2>영수증</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleGenerateReceipt} className="receipt-form">
          <label>메모 <small className="muted">(선택)</small>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="영수증에 남길 메모" />
          </label>
          <button type="submit" className="btn btn-primary">영수증 생성</button>
        </form>
        {filename && (
          <div className="receipt-actions">
            <a
              href={`${backend.base}/orders/${id}/receipt/print?note=${encodeURIComponent(note)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              인쇄용 보기
            </a>
            <form onSubmit={handleDownloadReceipt} className="receipt-actions__download">
              <input value={filename} onChange={(e) => setFilename(e.target.value)} aria-label="파일명" />
              <button type="submit" className="btn btn-ghost btn-sm">다운로드</button>
            </form>
          </div>
        )}
        {receipt && <pre className="receipt-view">{receipt}</pre>}
      </section>
    </div>
  );
}
