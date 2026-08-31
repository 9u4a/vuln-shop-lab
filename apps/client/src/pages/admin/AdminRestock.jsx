import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminRestock, sendRestock } from '../../api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 10;

export default function AdminRestock() {
  const { backend } = useBackend();
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(1);

  function load() {
    setError(null);
    fetchAdminRestock(backend.base).then((d) => setSubs(d.subscriptions)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const paged = subs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleSend(id) {
    setResult(null);
    setError(null);
    try {
      const res = await sendRestock(backend.base, id);
      setResult({ id, status: res.status, body: res.body });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <div className="admin-toolbar">
        <h2>재입고 알림 구독 <span className="muted">({subs.length})</span></h2>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>상품</th><th>회원</th><th>콜백 URL</th><th>발송</th></tr>
          </thead>
          <tbody>
            {paged.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.productName}</td>
                <td>{s.username}</td>
                <td style={{ maxWidth: 260, overflowWrap: 'anywhere' }}>{s.callbackUrl || '-'}</td>
                <td>
                  <button type="button" onClick={() => handleSend(s.id)} disabled={!s.callbackUrl}>통지 발송</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={subs.length} onChange={setPage} />

      {result && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <h3>구독 #{result.id} 콜백 응답 (status {result.status})</h3>
          <pre style={{ background: 'var(--color-subtle)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', overflowX: 'auto' }}>{result.body}</pre>
        </div>
      )}
    </section>
  );
}
