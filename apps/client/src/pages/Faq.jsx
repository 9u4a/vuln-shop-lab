import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { fetchFaqs } from '../api.js';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 8;

export default function Faq() {
  const { backend } = useBackend();
  const [faqs, setFaqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    fetchFaqs(backend.base, { q: query, page, pageSize: PAGE_SIZE })
      .then((data) => {
        setFaqs(data.faqs);
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
        <h1>자주 묻는 질문</h1>
        <p className="muted">
          궁금한 점을 모아 정리한 안내 게시판입니다. 원하는 답이 없다면{' '}
          <Link to="/qna">Q&amp;A</Link>에 직접 문의해 주세요.
        </p>
      </div>

      <form className="search-row" onSubmit={handleSearchSubmit}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="질문과 답변 검색..."
        />
        <button type="submit" className="btn btn-primary btn-sm">검색</button>
      </form>

      {error && <p className="error">{error}</p>}
      {faqs.length === 0 && !error && <p className="muted">아직 등록된 질문이 없습니다.</p>}

      <ul className="faq-list">
        {faqs.map((f) => {
          const open = openId === f.id;
          return (
            <li className="faq-item" key={f.id}>
              <button
                type="button"
                className="faq-item__q"
                onClick={() => setOpenId(open ? null : f.id)}
                aria-expanded={open}
              >
                <span className="faq-item__mark">Q</span>
                <span className="faq-item__question">{f.question}</span>
                <span className="faq-item__toggle" aria-hidden="true">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="faq-item__a">
                  <span className="faq-item__mark faq-item__mark--a">A</span>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{f.answer}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
    </div>
  );
}
