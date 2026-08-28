import { useEffect, useState } from 'react';
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
      {notices.map((n) => (
        <section className="card" key={n.id}>
          <h2>{n.title}</h2>
          {n.imageUrl && (
            <img
              className="notice-image"
              src={`${backend.uploadsBase}/${n.imageUrl}`}
              alt={n.title}
              loading="lazy"
            />
          )}
          <p style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p>
          <p className="muted">{n.createdAt}</p>
        </section>
      ))}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
}
