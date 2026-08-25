import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import { fetchFaqs, createFaq } from '../api.js';
import Pagination from '../components/Pagination.jsx';

const PAGE_SIZE = 5;

export default function Faq() {
  const { backend } = useBackend();
  const { user } = useSession();
  const [faqs, setFaqs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);

  function load() {
    setError(null);
    fetchFaqs(backend.base, { q: query, page, pageSize: PAGE_SIZE })
      .then((data) => {
        setFaqs(data.faqs);
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
    setSubmitStatus(null);
    try {
      await createFaq(backend.base, question, answer);
      setQuestion('');
      setAnswer('');
      setSubmitStatus('FAQ posted.');
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
        <h1>FAQ</h1>
        <p className="muted">Frequently asked questions.</p>
      </div>

      <form className="search-row" onSubmit={handleSearchSubmit}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions and answers..."
        />
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {error && <p className="error">{error}</p>}
      {faqs.length === 0 && !error && <p className="muted">No FAQs yet.</p>}
      {faqs.map((f) => (
        <section className="card" key={f.id}>
          <h2>Q. {f.question}</h2>
          <p>A. {f.answer}</p>
          {f.authorUsername && <p className="muted">Asked by {f.authorUsername}</p>}
        </section>
      ))}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />

      <section className="card">
        <h2>Ask a question</h2>
        {user ? (
          <>
            {submitStatus && <p className="status-ok">{submitStatus}</p>}
            {submitError && <p className="error">{submitError}</p>}
            <form onSubmit={handleCreate}>
              <label>Question
                <input value={question} onChange={(e) => setQuestion(e.target.value)} required />
              </label>
              <label>Answer
                <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows="3" required />
              </label>
              <button type="submit" className="btn btn-primary">Post FAQ</button>
            </form>
          </>
        ) : (
          <p className="muted">
            <Link to="/login">Log in</Link> to post a FAQ.
          </p>
        )}
      </section>
    </div>
  );
}
