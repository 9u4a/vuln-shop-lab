import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrder, generateReceipt, fetchReceipt, requestReturn } from '../api.js';
import { formatCurrency } from '../format.js';
import StatusChip from '../components/StatusChip.jsx';

export default function OrderDetail() {
  const { backend } = useBackend();
  const { id } = useParams();
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
        <div className="summary-box__row summary-box__row--total" style={{ marginTop: 'var(--space-4)' }}>
          <span>총 결제금액</span><span className="tnum">{formatCurrency(data.order.totalAmount)}</span>
        </div>
      </section>

      <section className="card">
        <h2>반품/환불 요청</h2>
        <form onSubmit={handleRequestReturn}>
          <label>사유
            <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="반품 사유를 입력하세요" />
          </label>
          <button type="submit" className="btn btn-ghost">반품/환불 요청</button>
        </form>
        {returnMsg && <p className="status-ok">{returnMsg}</p>}
      </section>

      <section className="card">
        <h2>영수증</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleGenerateReceipt}>
          <label>메모
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">영수증 생성</button>
        </form>
        <p style={{ marginTop: 'var(--space-4)' }}>
          <a
            href={`${backend.base}/orders/${id}/receipt/print?note=${encodeURIComponent(note)}`}
            target="_blank"
            rel="noreferrer"
          >
            인쇄용 보기
          </a>
        </p>
        <form onSubmit={handleDownloadReceipt}>
          <label>파일명
            <input value={filename} onChange={(e) => setFilename(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">영수증 다운로드</button>
        </form>
        {receipt && <pre style={{ background: 'var(--color-subtle)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', overflowX: 'auto' }}>{receipt}</pre>}
      </section>
    </div>
  );
}
