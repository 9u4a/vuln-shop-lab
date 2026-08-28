import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchEventsManage, createEvent, updateEvent, deleteEvent } from '../../api.js';

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
      <label>이미지 URL (선택)
        <input value={value.imageUrl} onChange={set('imageUrl')} placeholder="/uploads/node/..." />
      </label>
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

  function load() {
    setError(null);
    fetchEventsManage(backend.base).then((d) => setEvents(d.events)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleCreate(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await createEvent(backend.base, draft);
      setDraft(emptyEvent);
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
        <h2>이벤트 <span className="muted">({events.length})</span></h2>
        <p className="muted">활성 이벤트는 메인 페이지 접속 시 팝업으로 노출됩니다.</p>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}

        <div>
          {events.map((ev) => (
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
                    <button type="button" onClick={() => handleDelete(ev.id)}>삭제</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>이벤트 추가</h2>
        <EventForm value={draft} onChange={setDraft} onSubmit={handleCreate} submitLabel="이벤트 추가" />
      </section>
    </>
  );
}
