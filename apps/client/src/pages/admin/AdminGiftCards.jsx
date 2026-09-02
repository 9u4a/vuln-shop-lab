import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchGiftCardsManage, createGiftCard, updateGiftCard, deleteGiftCard } from '../../api.js';
import { formatCurrency } from '../../format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const emptyCard = { code: '', balance: '', active: true, expiresAt: '' };

function GiftCardForm({ value, onChange, onSubmit, submitLabel, onCancel }) {
  const set = (field) => (e) =>
    onChange({ ...value, [field]: field === 'active' ? e.target.checked : e.target.value });
  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 'none' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <label style={{ flex: '2 1 220px' }}>코드
          <input value={value.code} onChange={set('code')} placeholder="GIFT-2026-0001" required />
        </label>
        <label style={{ flex: '1 1 160px' }}>금액(원)
          <input type="number" min="0" value={value.balance} onChange={set('balance')} required />
        </label>
      </div>
      <label>만료 일시 (선택)
        <input type="datetime-local" value={(value.expiresAt || '').slice(0, 16)} onChange={set('expiresAt')} />
      </label>
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input type="checkbox" checked={!!value.active} onChange={set('active')} style={{ width: 'auto' }} />
        활성 (등록 가능)
      </label>
      <div className="admin-item-row__actions">
        <button type="submit" className="btn btn-primary btn-sm">{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>취소</button>}
      </div>
    </form>
  );
}

function normalize(form) {
  return { ...form, balance: Number(form.balance) || 0, expiresAt: form.expiresAt || null };
}

export default function AdminGiftCards() {
  const { backend } = useBackend();
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState(emptyCard);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyCard);
  const [pendingId, setPendingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  function load() {
    setError(null);
    fetchGiftCardsManage(backend.base).then((d) => setCards(d.giftCards)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const paged = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await createGiftCard(backend.base, normalize(draft));
      setDraft(emptyCard);
      setShowForm(false);
      setStatus('상품권이 발행되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({ code: c.code || '', balance: c.balance ?? '', active: !!c.active, expiresAt: c.expiresAt || '' });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateGiftCard(backend.base, editingId, normalize(editForm));
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(c) {
    try {
      await updateGiftCard(backend.base, c.id, { active: !c.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteGiftCard(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="card">
        <div className="admin-toolbar">
          <h2>상품권 <span className="muted">({cards.length})</span></h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            + 상품권 발행
          </button>
        </div>
        <p className="muted">발행한 상품권 코드를 고객이 마이페이지에서 등록하면 잔액이 적립금으로 전환됩니다.</p>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}

        <div>
          {paged.map((c) => (
            <div key={c.id} className="admin-item-row">
              <div className="admin-item-row__body">
                <strong><span className="badge">{c.code}</span> {formatCurrency(c.balance)}원</strong>
                <span className="muted">
                  {c.active ? '활성' : '비활성'}
                  {c.expiresAt && ` · ~${c.expiresAt.slice(0, 10)}`}
                </span>
              </div>
              <div className="admin-item-row__actions">
                <button type="button" onClick={() => toggleActive(c)}>{c.active ? '비활성화' : '활성화'}</button>
                <button type="button" onClick={() => startEdit(c)}>수정</button>
                <button type="button" onClick={() => setPendingId(c.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={cards.length} onChange={setPage} />
      </section>

      <Modal open={showForm} title="상품권 발행" onClose={() => setShowForm(false)} wide>
        <GiftCardForm value={draft} onChange={setDraft} onSubmit={handleCreate} submitLabel="발행" onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={editingId != null} title="상품권 수정" onClose={() => setEditingId(null)} wide>
        <GiftCardForm value={editForm} onChange={setEditForm} onSubmit={handleSaveEdit} submitLabel="저장" onCancel={() => setEditingId(null)} />
      </Modal>

      <ConfirmDialog
        open={pendingId != null}
        title="상품권을 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
