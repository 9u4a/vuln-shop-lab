import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminReferrals } from '../../api.js';
import { formatCurrency } from '../../format.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 15;

export default function AdminReferrals() {
  const { backend } = useBackend();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setError(null);
    fetchAdminReferrals(backend.base).then((d) => setRows(d.referrals)).catch((e) => setError(e.message));
  }, [backend.base]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) =>
        (r.username || '').toLowerCase().includes(q) ||
        (r.referralCode || '').toLowerCase().includes(q) ||
        (r.referredByUsername || '').toLowerCase().includes(q))
    : rows;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section className="card">
      <div className="admin-toolbar">
        <h2>추천인 내역 <span className="muted">({rows.length})</span></h2>
        <input
          className="admin-search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="회원·추천코드·추천인 검색"
        />
        {q && <span className="muted">{filtered.length}건</span>}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>회원</th><th>추천 코드</th><th>추천인(피추천)</th>
              <th className="tnum">추천 수</th><th className="tnum">포인트</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.id}>
                <td>{r.username}</td>
                <td>{r.referralCode || '-'}</td>
                <td>{r.referredByUsername || '-'}</td>
                <td className="tnum">{r.referredCount}</td>
                <td className="tnum">{formatCurrency(r.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
    </section>
  );
}
