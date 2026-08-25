import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchNotices, createNoticeAdmin, deleteNoticeAdmin } from '../../api.js';

const emptyNotice = { title: '', body: '' };

export default function AdminNotices() {
  const { backend } = useBackend();
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState(emptyNotice);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    fetchNotices(backend.base, { pageSize: 50 }).then((d) => setNotices(d.notices)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createNoticeAdmin(backend.base, newNotice.title, newNotice.body);
      setNewNotice(emptyNotice);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNoticeAdmin(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>공지사항</h2>
      {error && <p className="error">{error}</p>}
      <ul>
        {notices.map((n) => (
          <li key={n.id}>
            <strong>{n.title}</strong> — {n.body}
            <button onClick={() => handleDelete(n.id)}>삭제</button>
          </li>
        ))}
      </ul>
      <h2>공지사항 추가</h2>
      <form onSubmit={handleCreate}>
        <label>제목
          <input value={newNotice.title} onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })} required />
        </label>
        <label>내용
          <textarea value={newNotice.body} onChange={(e) => setNewNotice({ ...newNotice, body: e.target.value })} rows="3" required />
        </label>
        <button type="submit" className="btn btn-primary">공지사항 추가</button>
      </form>
    </section>
  );
}
