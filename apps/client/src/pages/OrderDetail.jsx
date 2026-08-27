import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchOrder, generateReceipt, fetchReceipt } from '../api.js';
import { formatCurrency } from '../format.js';

export default function OrderDetail() {
  const { backend } = useBackend();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  const [filename, setFilename] = useState('');
  const [receipt, setReceipt] = useState(null);

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

      <section className="card">
        <h2>영수증</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleGenerateReceipt}>
          <label>메모
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">영수증 생성</button>
        </form>
        <form onSubmit={handleDownloadReceipt}>
          <label>파일명
            <input value={filename} onChange={(e) => setFilename(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">영수증 다운로드</button>
        </form>
        {receipt && <pre>{receipt}</pre>}
      </section>
    </div>
  );
}
