import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchFaqs, createFaq, updateFaqAdmin, deleteFaqAdmin } from '../../api.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const emptyFaq = { question: '', answer: '' };

export default function AdminFaq() {
  const { backend } = useBackend();
  const [faqs, setFaqs] = useState([]);
  const [newFaq, setNewFaq] = useState(emptyFaq);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyFaq);
  const [pendingId, setPendingId] = useState(null);

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

  function startEdit(f) {
    setEditingId(f.id);
    setEditForm({ question: f.question, answer: f.answer });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateFaqAdmin(backend.base, editingId, editForm.question, editForm.answer);
      setEditingId(null);
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
      <h2>FAQ <span className="muted">({faqs.length})</span></h2>
      {error && <p className="error">{error}</p>}

      <div>
        {faqs.map((f) => (
          <div key={f.id} className="admin-item-row">
            {editingId === f.id ? (
              <form onSubmit={handleSaveEdit} style={{ flex: 1, maxWidth: 'none' }}>
                <label>질문
                  <input value={editForm.question} onChange={(e) => setEditForm({ ...editForm, question: e.target.value })} required />
                </label>
                <label>답변
                  <textarea value={editForm.answer} onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })} rows="3" required />
                </label>
                <div className="admin-item-row__actions">
                  <button type="submit" className="btn btn-primary btn-sm">저장</button>
                  <button type="button" onClick={() => setEditingId(null)}>취소</button>
                </div>
              </form>
            ) : (
              <>
                <div className="admin-item-row__body">
                  <strong>Q. {f.question}</strong>
                  <span className="muted" style={{ whiteSpace: 'pre-wrap' }}>A. {f.answer}</span>
                </div>
                <div className="admin-item-row__actions">
                  <button type="button" onClick={() => startEdit(f)}>수정</button>
                  <button type="button" onClick={() => setPendingId(f.id)}>삭제</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 'var(--space-8)' }}>FAQ 추가</h2>
      <form onSubmit={handleCreate}>
        <label>질문
          <input value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} required />
        </label>
        <label>답변
          <textarea value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} rows="3" required />
        </label>
        <button type="submit" className="btn btn-primary">FAQ 추가</button>
      </form>

      <ConfirmDialog
        open={pendingId != null}
        title="FAQ를 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </section>
  );
}
