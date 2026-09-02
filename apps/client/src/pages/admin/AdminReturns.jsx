import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminReturns, approveReturn, rejectReturn } from '../../api.js';
import { formatCurrency } from '../../format.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 10;
const STATUS_LABEL = { requested: '요청', approved: '승인', rejected: '거부', refunded: '환불완료' };

export default function AdminReturns() {
  const { backend } = useBackend();
  const [returns, setReturns] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    setError(null);
    fetchAdminReturns(backend.base).then((d) => setReturns(d.returns)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const q = query.trim().toLowerCase();
  const filtered = returns.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (!q) return true;
    return (r.username || '').toLowerCase().includes(q) || String(r.orderId).includes(q) || (r.reason || '').toLowerCase().includes(q);
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleApprove(id) {
    setStatus(null);
    try {
      const res = await approveReturn(backend.base, id);
      setStatus(`반품 #${id} 환불 처리 완료 (${formatCurrency(res.refundAmount)}P 환급).`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await rejectReturn(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <div className="admin-toolbar">
        <h2>반품/환불 <span className="muted">({returns.length})</span></h2>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="회원·주문번호·사유 검색"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {status && <p className="status-ok">{status}</p>}
      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>주문</th><th>회원</th><th>사유</th>
              <th className="tnum">환불액</th><th>상태</th><th>관리</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>#{r.orderId}</td>
                <td>{r.username}</td>
                <td>{r.reason || '-'}</td>
                <td className="tnum">{formatCurrency(r.refundAmount)}</td>
                <td>{STATUS_LABEL[r.status] || r.status}</td>
                <td>
                  <div className="admin-item-row__actions">
                    <button type="button" onClick={() => handleApprove(r.id)}>승인·환불</button>
                    <button type="button" onClick={() => handleReject(r.id)}>거부</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
    </section>
  );
}
