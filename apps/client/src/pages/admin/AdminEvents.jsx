import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchEventsManage, createEvent, updateEvent, deleteEvent } from '../../api.js';
import AdminImageField from '../../components/AdminImageField.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Pagination from '../../components/Pagination.jsx';

const emptyEvent = {
  title: '',
  body: '',
  imageUrl: '',
  linkUrl: '',
  active: true,
  startsAt: '',
  endsAt: '',
};

function EventForm({ value, onChange, onSubmit, submitLabel, onCancel }) {
  const set = (field) => (e) =>
    onChange({ ...value, [field]: field === 'active' ? e.target.checked : e.target.value });
  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 'none' }}>
      <label>제목
        <input value={value.title} onChange={set('title')} required />
      </label>
      <label>본문 (HTML 허용)
        <textarea value={value.body} onChange={set('body')} rows="4" placeholder="<p>할인 내용...</p>" />
      </label>
      <AdminImageField label="이미지" value={value.imageUrl} onChange={(filename) => onChange({ ...value, imageUrl: filename })} />
      <label>링크 URL (선택)
        <input value={value.linkUrl} onChange={set('linkUrl')} placeholder="/products?category=displays" />
      </label>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 180px' }}>시작 일시 (선택)
          <input type="datetime-local" value={(value.startsAt || '').slice(0, 16)} onChange={set('startsAt')} />
        </label>
        <label style={{ flex: '1 1 180px' }}>종료 일시 (선택)
          <input type="datetime-local" value={(value.endsAt || '').slice(0, 16)} onChange={set('endsAt')} />
        </label>
      </div>
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input type="checkbox" checked={!!value.active} onChange={set('active')} style={{ width: 'auto' }} />
        활성 (게시)
      </label>
      <div className="admin-item-row__actions">
        <button type="submit" className="btn btn-primary btn-sm">{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>취소</button>}
      </div>
    </form>
  );
}

export default function AdminEvents() {
  const { backend } = useBackend();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState(emptyEvent);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEvent);
  const [pendingId, setPendingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  function load() {
    setError(null);
    fetchEventsManage(backend.base).then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const paged = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await createEvent(backend.base, draft);
      setDraft(emptyEvent);
      setShowForm(false);
      setStatus('이벤트가 추가되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setEditForm({
      title: ev.title || '',
      body: ev.body || '',
      imageUrl: ev.imageUrl || '',
      linkUrl: ev.linkUrl || '',
      active: !!ev.active,
      startsAt: ev.startsAt || '',
      endsAt: ev.endsAt || '',
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateEvent(backend.base, editingId, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(ev) {
    try {
      await updateEvent(backend.base, ev.id, { active: !ev.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEvent(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="card">
        <div className="admin-toolbar">
          <h2>이벤트 <span className="muted">({events.length})</span></h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? '취소' : '+ 이벤트 추가'}
          </button>
        </div>
        <p className="muted">노출기간(시작·종료)이 설정된 활성 이벤트만 메인 팝업으로 노출됩니다.</p>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}

        {showForm && (
          <div className="admin-create-form">
            <EventForm value={draft} onChange={setDraft} onSubmit={handleCreate} submitLabel="이벤트 추가" />
          </div>
        )}

        <div>
          {paged.map((ev) => (
            <div key={ev.id} className="admin-item-row">
              {editingId === ev.id ? (
                <div style={{ flex: 1 }}>
                  <EventForm
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={handleSaveEdit}
                    submitLabel="저장"
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <>
                  <div className="admin-item-row__body">
                    <strong>{ev.title}</strong>
                    <span className="muted">
                      {ev.active ? '활성' : '비활성'}
                      {(ev.startsAt || ev.endsAt) &&
                        ` · ${(ev.startsAt || '').slice(0, 16) || '상시'} ~ ${(ev.endsAt || '').slice(0, 16) || '상시'}`}
                      {ev.linkUrl && ` · 링크: ${ev.linkUrl}`}
                    </span>
                  </div>
                  <div className="admin-item-row__actions">
                    <button type="button" onClick={() => toggleActive(ev)}>{ev.active ? '비활성화' : '활성화'}</button>
                    <button type="button" onClick={() => startEdit(ev)}>수정</button>
                    <button type="button" onClick={() => setPendingId(ev.id)}>삭제</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={events.length} onChange={setPage} />
      </section>

      <ConfirmDialog
        open={pendingId != null}
        title="이벤트를 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
