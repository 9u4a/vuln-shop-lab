import { useEffect, useState } from 'react';
import { useBackend } from '../BackendContext.jsx';
import { fetchNotices } from '../api.js';

export default function Notices() {
  const { backend } = useBackend();
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotices(backend.base)
      .then((data) => setNotices(data.notices))
      .catch((err) => setError(err.message));
  }, [backend.base]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Notices</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {notices.length === 0 && !error && <p className="muted">No notices yet.</p>}
      {notices.map((n) => (
        <section className="card" key={n.id}>
          <h2>{n.title}</h2>
          <p>{n.body}</p>
          <p className="muted">{n.createdAt}</p>
        </section>
      ))}
    </div>
  );
}
