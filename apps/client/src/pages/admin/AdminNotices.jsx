import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchNotices, createNoticeAdmin, updateNoticeAdmin, deleteNoticeAdmin } from '../../api.js';
import AdminImageField from '../../components/AdminImageField.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const emptyNotice = { title: '', body: '', imageUrl: '' };

export default function AdminNotices() {
  const { backend } = useBackend();
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState(emptyNotice);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyNotice);
  const [pendingId, setPendingId] = useState(null);

  function load() {
    setError(null);
    fetchNotices(backend.base, { pageSize: 50 }).then((d) => setNotices(d.notices)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createNoticeAdmin(backend.base, newNotice.title, newNotice.body, newNotice.imageUrl);
      setNewNotice(emptyNotice);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(n) {
    setEditingId(n.id);
    setEditForm({ title: n.title, body: n.body, imageUrl: n.imageUrl || '' });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateNoticeAdmin(backend.base, editingId, editForm.title, editForm.body, editForm.imageUrl);
      setEditingId(null);
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
      <h2>공지사항 <span className="muted">({notices.length})</span></h2>
      {error && <p className="error">{error}</p>}

      <div>
        {notices.map((n) => (
          <div key={n.id} className="admin-item-row">
            {editingId === n.id ? (
              <form onSubmit={handleSaveEdit} style={{ flex: 1, maxWidth: 'none' }}>
                <label>제목
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                </label>
                <label>내용
                  <textarea value={editForm.body} onChange={(e) => setEditForm({ ...editForm, body: e.target.value })} rows="5" required />
                </label>
                <AdminImageField value={editForm.imageUrl} onChange={(f) => setEditForm({ ...editForm, imageUrl: f })} />
                <div className="admin-item-row__actions">
                  <button type="submit" className="btn btn-primary btn-sm">저장</button>
                  <button type="button" onClick={() => setEditingId(null)}>취소</button>
                </div>
              </form>
            ) : (
              <>
                <div className="admin-item-row__body">
                  <strong>{n.title}</strong>
                  <span className="muted" style={{ whiteSpace: 'pre-wrap' }}>{n.body}</span>
                </div>
                <div className="admin-item-row__actions">
                  <button type="button" onClick={() => startEdit(n)}>수정</button>
                  <button type="button" onClick={() => setPendingId(n.id)}>삭제</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 'var(--space-8)' }}>공지사항 추가</h2>
      <form onSubmit={handleCreate}>
        <label>제목
          <input value={newNotice.title} onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })} required />
        </label>
        <label>내용
          <textarea value={newNotice.body} onChange={(e) => setNewNotice({ ...newNotice, body: e.target.value })} rows="5" required />
        </label>
        <AdminImageField value={newNotice.imageUrl} onChange={(f) => setNewNotice({ ...newNotice, imageUrl: f })} />
        <button type="submit" className="btn btn-primary">공지사항 추가</button>
      </form>

      <ConfirmDialog
        open={pendingId != null}
        title="공지사항을 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </section>
  );
}
