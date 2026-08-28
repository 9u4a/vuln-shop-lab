import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { fetchQuestions, createQuestion } from '../api.js';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 8;

export default function Qna() {
  const { backend } = useBackend();
  const { user } = useSession();
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [secret, setSecret] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  function load() {
    setError(null);
    fetchQuestions(backend.base, { q: query, page, pageSize: PAGE_SIZE })
      .then((data) => {
        setQuestions(data.questions);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, [backend.base, page, query]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitError(null);
    try {
      await createQuestion(backend.base, { title, body, secret });
      setTitle('');
      setBody('');
      setSecret(false);
      setShowForm(false);
      setPage(1);
      setQuery('');
      setSearch('');
      load();
    } catch (err) {
      setSubmitError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Q&amp;A</h1>
        <p className="muted">상품·주문·배송 등 궁금한 점을 문의하면 관리자가 답변해 드립니다.</p>
      </div>

      <div className="qna-toolbar">
        <form className="search-row" onSubmit={handleSearchSubmit}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목 검색..."
          />
          <button type="submit" className="btn btn-primary btn-sm">검색</button>
        </form>
        {user && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? '취소' : '문의하기'}
          </button>
        )}
      </div>

      {showForm && user && (
        <section className="card">
          <h2>문의 작성</h2>
          {submitError && <p className="error">{submitError}</p>}
          <form onSubmit={handleCreate}>
            <label>제목
              <input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label>내용
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="4" required />
            </label>
            <label className="review-secret-check">
              <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
              비밀글로 작성 (작성자와 관리자만 볼 수 있어요)
            </label>
            <button type="submit" className="btn btn-primary">등록</button>
          </form>
        </section>
      )}

      {error && <p className="error">{error}</p>}
      {questions.length === 0 && !error && <p className="muted">아직 등록된 문의가 없습니다.</p>}
      {questions.length > 0 && (
        <ul className="post-list">
          {questions.map((q) => (
            <li key={q.id} className="post-list__item">
              <Link to={`/qna/${q.id}`} className="post-list__title">
                {q.secret && <span title="비밀글" aria-label="비밀글"> 🔒 </span>}
                {q.title}
              </Link>
              <span className="qna-meta">
                <span className={`chip ${q.answered ? 'chip--done' : 'chip--wait'}`}>
                  {q.answered ? '답변완료' : '답변대기'}
                </span>
                <span className="post-list__date">{(q.createdAt || '').slice(0, 10)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      {!user && (
        <p className="muted">
          <Link to="/login">로그인</Link> 후 문의를 남길 수 있습니다.
        </p>
      )}
    </div>
  );
}
