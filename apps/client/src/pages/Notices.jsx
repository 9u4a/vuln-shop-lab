import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchNotices } from '../api.js';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 5;

export default function Notices() {
  const { backend } = useBackend();
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    fetchNotices(backend.base, { q: query, page, pageSize: PAGE_SIZE })
      .then((data) => {
        setNotices(data.notices);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message));
  }, [backend.base, page, query]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>공지사항</h1>
      </div>

      <form className="search-row" onSubmit={handleSearchSubmit}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="공지사항 검색..."
        />
        <button type="submit" className="btn btn-primary btn-sm">검색</button>
      </form>

      {error && <p className="error">{error}</p>}
      {notices.length === 0 && !error && <p className="muted">아직 공지사항이 없습니다.</p>}
      {notices.length > 0 && (
        <ul className="post-list">
          {notices.map((n) => (
            <li key={n.id} className="post-list__item">
              <Link to={`/notices/${n.id}`} className="post-list__title">{n.title}</Link>
              <span className="post-list__date">{(n.createdAt || '').slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
}
