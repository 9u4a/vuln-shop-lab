import { useEffect, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { fetchFaqs } from '../api.js';

export default function Faq() {
  const { backend } = useBackend();
  const [faqs, setFaqs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFaqs(backend.base)
      .then((data) => setFaqs(data.faqs))
      .catch((err) => setError(err.message));
  }, [backend.base]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>FAQ</h1>
        <p className="muted">Frequently asked questions.</p>
      </div>
      {error && <p className="error">{error}</p>}
      {faqs.length === 0 && !error && <p className="muted">No FAQs yet.</p>}
      {faqs.map((f) => (
        <section className="card" key={f.id}>
          <h2>Q. {f.question}</h2>
          <p>A. {f.answer}</p>
        </section>
      ))}
    </div>
  );
}
