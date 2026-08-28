import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchCouponsManage, createCoupon, updateCoupon, deleteCoupon } from '../../api.js';
import { formatCurrency } from '../../format.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const emptyCoupon = {
  code: '',
  title: '',
  description: '',
  discountType: 'amount',
  discountValue: '',
  minOrderAmount: '',
  active: true,
  expiresAt: '',
};

function CouponForm({ value, onChange, onSubmit, submitLabel, onCancel }) {
  const set = (field) => (e) =>
    onChange({ ...value, [field]: field === 'active' ? e.target.checked : e.target.value });
  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 'none' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 160px' }}>코드
          <input value={value.code} onChange={set('code')} placeholder="WELCOME5000" required />
        </label>
        <label style={{ flex: '2 1 220px' }}>제목
          <input value={value.title} onChange={set('title')} required />
        </label>
      </div>
      <label>설명
        <textarea value={value.description} onChange={set('description')} rows="2" />
      </label>
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 140px' }}>할인 방식
          <select value={value.discountType} onChange={set('discountType')}>
            <option value="amount">정액(원)</option>
            <option value="percent">정률(%)</option>
          </select>
        </label>
        <label style={{ flex: '1 1 140px' }}>할인 값
          <input type="number" min="0" value={value.discountValue} onChange={set('discountValue')} required />
        </label>
        <label style={{ flex: '1 1 160px' }}>최소 주문금액
          <input type="number" min="0" value={value.minOrderAmount} onChange={set('minOrderAmount')} />
        </label>
      </div>
      <label>만료 일시 (선택)
        <input type="datetime-local" value={(value.expiresAt || '').slice(0, 16)} onChange={set('expiresAt')} />
      </label>
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
        <input type="checkbox" checked={!!value.active} onChange={set('active')} style={{ width: 'auto' }} />
        활성 (발급 가능)
      </label>
      <div className="admin-item-row__actions">
        <button type="submit" className="btn btn-primary btn-sm">{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>취소</button>}
      </div>
    </form>
  );
}

function normalize(form) {
  return {
    ...form,
    discountValue: Number(form.discountValue) || 0,
    minOrderAmount: Number(form.minOrderAmount) || 0,
    expiresAt: form.expiresAt || null,
  };
}

export default function AdminCoupons() {
  const { backend } = useBackend();
  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [draft, setDraft] = useState(emptyCoupon);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyCoupon);
  const [pendingId, setPendingId] = useState(null);

  function load() {
    setError(null);
    fetchCouponsManage(backend.base).then((d) => setCoupons(d.coupons)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleCreate(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await createCoupon(backend.base, normalize(draft));
      setDraft(emptyCoupon);
      setStatus('쿠폰이 추가되었습니다.');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({
      code: c.code || '',
      title: c.title || '',
      description: c.description || '',
      discountType: c.discountType || 'amount',
      discountValue: c.discountValue ?? '',
      minOrderAmount: c.minOrderAmount ?? '',
      active: !!c.active,
      expiresAt: c.expiresAt || '',
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      await updateCoupon(backend.base, editingId, normalize(editForm));
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(c) {
    try {
      await updateCoupon(backend.base, c.id, { active: !c.active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteCoupon(backend.base, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const label = (c) => c.discountType === 'percent' ? `${c.discountValue}%` : formatCurrency(c.discountValue);

  return (
    <>
      <section className="card">
        <h2>쿠폰 <span className="muted">({coupons.length})</span></h2>
        <p className="muted">활성 쿠폰은 사용자 쿠폰 페이지에서 발급받을 수 있습니다.</p>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}

        <div>
          {coupons.map((c) => (
            <div key={c.id} className="admin-item-row">
              {editingId === c.id ? (
                <div style={{ flex: 1 }}>
                  <CouponForm value={editForm} onChange={setEditForm} onSubmit={handleSaveEdit} submitLabel="저장" onCancel={() => setEditingId(null)} />
                </div>
              ) : (
                <>
                  <div className="admin-item-row__body">
                    <strong>{c.title} <span className="badge">{c.code}</span></strong>
                    <span className="muted">
                      {label(c)} 할인 · {c.active ? '활성' : '비활성'}
                      {c.minOrderAmount > 0 && ` · ${formatCurrency(c.minOrderAmount)} 이상`}
                      {c.expiresAt && ` · ~${c.expiresAt.slice(0, 10)}`}
                    </span>
                  </div>
                  <div className="admin-item-row__actions">
                    <button type="button" onClick={() => toggleActive(c)}>{c.active ? '비활성화' : '활성화'}</button>
                    <button type="button" onClick={() => startEdit(c)}>수정</button>
                    <button type="button" onClick={() => setPendingId(c.id)}>삭제</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>쿠폰 추가</h2>
        <CouponForm value={draft} onChange={setDraft} onSubmit={handleCreate} submitLabel="쿠폰 추가" />
      </section>

      <ConfirmDialog
        open={pendingId != null}
        title="쿠폰을 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
