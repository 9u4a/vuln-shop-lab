import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchFaqs, createFaq, deleteFaqAdmin } from '../../api.js';

const emptyFaq = { question: '', answer: '' };

export default function AdminFaq() {
  const { backend } = useBackend();
  const [faqs, setFaqs] = useState([]);
  const [newFaq, setNewFaq] = useState(emptyFaq);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    fetchFaqs(backend.base, { pageSize: 50 }).then((d) => setFaqs(d.faqs)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createFaq(backend.base, newFaq.question, newFaq.answer);
      setNewFaq(emptyFaq);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFaqAdmin(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>FAQ</h2>
      {error && <p className="error">{error}</p>}
      <ul>
        {faqs.map((f) => (
          <li key={f.id}>
            <strong>{f.question}</strong> — {f.answer}
            <button onClick={() => handleDelete(f.id)}>삭제</button>
          </li>
        ))}
      </ul>
      <h2>FAQ 추가</h2>
      <form onSubmit={handleCreate}>
        <label>질문
          <input value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} required />
        </label>
        <label>답변
          <textarea value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} rows="3" required />
        </label>
        <button type="submit" className="btn btn-primary">FAQ 추가</button>
      </form>
    </section>
  );
}
