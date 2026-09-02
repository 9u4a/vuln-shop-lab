import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import {
  fetchGiftCardProductsManage, createGiftCardProduct, updateGiftCardProduct, deleteGiftCardProduct,
} from '../../api.js';
import { formatCurrency } from '../../format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const emptyProduct = { name: '', amount: '', active: true };

function ProductForm({ value, onChange, onSubmit, submitLabel, onCancel }) {
  const set = (field) => (e) =>
    onChange({ ...value, [field]: field === 'active' ? e.target.checked : e.target.value });
  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 'none' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <label style={{ flex: '2 1 220px' }}>이름
          <input value={value.name} onChange={set('name')} placeholder="예: 1만원권" required />
        </label>
        <label style={{ flex: '1 1 160px' }}>금액(원)
          <input type="number" min="0" value={value.amount} onChange={set('amount')} required />
        </label>
      </div>
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input type="checkbox" checked={!!value.active} onChange={set('active')} style={{ width: 'auto' }} />
        활성 (구매 가능)
      </label>
      <div className="admin-item-row__actions">
        <button type="submit" className="btn btn-primary btn-sm">{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>취소</button>}
      </div>
    </form>
  );
}

function normalize(form) {
  return { name: form.name, amount: Number(form.amount) || 0, active: !!form.active };
}

const ACTIVE_FILTERS = [
  { value: '', label: '전체' },
  { value: '1', label: '활성' },
  { value: '0', label: '비활성' },
];

export default function AdminGiftCards() {
  const { backend } = useBackend();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyProduct);
  const [pendingId, setPendingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const PAGE_SIZE = 10;

  function load() {
    setError(null);
    fetchGiftCardProductsManage(backend.base).then((d) => setProducts(d.products)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const q = query.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (activeFilter && String(p.active ? 1 : 0) !== activeFilter) return false;
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q) || String(p.amount).includes(q);
  });
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleCreate(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await createGiftCardProduct(backend.base, normalize(draft));
      setDraft(emptyProduct);
      setShowForm(false);
      setStatus('상품권 액면가가 등록되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ name: p.name || '', amount: p.amount ?? '', active: !!p.active });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateGiftCardProduct(backend.base, editingId, normalize(editForm));
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(p) {
    try {
      await updateGiftCardProduct(backend.base, p.id, { active: !p.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteGiftCardProduct(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="card">
        <div className="admin-toolbar">
          <h2>상품권 액면가 <span className="muted">({products.length})</span></h2>
          <input
            className="admin-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="이름·금액 검색"
          />
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}>
            {ACTIVE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            + 액면가 추가
          </button>
        </div>
        <p className="muted">고객은 마이페이지에서 액면가를 골라 상품권을 구매하고, 발급된 코드를 등록하면 적립금으로 전환됩니다.</p>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}

        <div>
          {paged.map((p) => (
            <div key={p.id} className="admin-item-row">
              <div className="admin-item-row__body">
                <strong>{p.name} · {formatCurrency(p.amount)}원</strong>
                <span className="muted">{p.active ? '활성' : '비활성'}</span>
              </div>
              <div className="admin-item-row__actions">
                <button type="button" onClick={() => toggleActive(p)}>{p.active ? '비활성화' : '활성화'}</button>
                <button type="button" onClick={() => startEdit(p)}>수정</button>
                <button type="button" onClick={() => setPendingId(p.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
      </section>

      <Modal open={showForm} title="상품권 액면가 추가" onClose={() => setShowForm(false)} wide>
        <ProductForm value={draft} onChange={setDraft} onSubmit={handleCreate} submitLabel="추가" onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={editingId != null} title="상품권 액면가 수정" onClose={() => setEditingId(null)} wide>
        <ProductForm value={editForm} onChange={setEditForm} onSubmit={handleSaveEdit} submitLabel="저장" onCancel={() => setEditingId(null)} />
      </Modal>

      <ConfirmDialog
        open={pendingId != null}
        title="액면가를 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
