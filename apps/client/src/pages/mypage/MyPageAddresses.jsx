import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAddresses, createAddress, updateAddress, deleteAddress } from '../../api.js';
import AddressSearchModal from '../../components/AddressSearchModal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

const emptyForm = { label: '', name: '', phone: '', postcode: '', address: '', addressDetail: '', isDefault: false };

export default function MyPageAddresses() {
  const { backend } = useBackend();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    fetchAddresses(backend.base).then((d) => setAddresses(d.addresses)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: field === 'isDefault' ? e.target.checked : e.target.value }));

  function handleAddressSelect(addr) {
    setForm((f) => ({ ...f, postcode: addr.zonecode, address: addr.address }));
    setShowModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateAddress(backend.base, editingId, form);
      } else {
        await createAddress(backend.base, form);
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(a) {
    setEditingId(a.id);
    setForm({
      label: a.label || '', name: a.name || '', phone: a.phone || '',
      postcode: a.postcode || '', address: a.address || '', addressDetail: a.addressDetail || '',
      isDefault: !!a.isDefault,
    });
  }

  async function makeDefault(a) {
    try {
      await updateAddress(backend.base, a.id, { isDefault: true });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAddress(backend.base, id);
      if (editingId === id) { setEditingId(null); setForm(emptyForm); }
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="card">
        <h2>배송지 목록</h2>
        {error && <p className="error">{error}</p>}
        {addresses.length === 0 ? (
          <p className="muted">저장된 배송지가 없습니다.</p>
        ) : (
          <div>
            {addresses.map((a) => (
              <div key={a.id} className="admin-item-row">
                <div className="admin-item-row__body">
                  <strong>
                    {a.name} {a.label && <span className="badge">{a.label}</span>}
                    {a.isDefault && <span className="badge">기본 배송지</span>}
                  </strong>
                  <span className="muted">
                    {a.postcode && `[${a.postcode}] `}{a.address} {a.addressDetail} {a.phone && `· ${a.phone}`}
                  </span>
                </div>
                <div className="admin-item-row__actions">
                  {!a.isDefault && <button type="button" onClick={() => makeDefault(a)}>기본으로</button>}
                  <button type="button" onClick={() => startEdit(a)}>수정</button>
                  <button type="button" onClick={() => setPendingId(a.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{editingId ? '배송지 수정' : '배송지 추가'}</h2>
        <form onSubmit={handleSubmit}>
          <label>배송지 이름 (선택)
            <input value={form.label} onChange={set('label')} placeholder="집, 회사 등" />
          </label>
          <label>수령인
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label>전화번호
            <input value={form.phone} onChange={set('phone')} placeholder="010-1234-5678" />
          </label>
          <label>우편번호
            <div className="address-row">
              <input value={form.postcode} readOnly placeholder="주소 검색으로 입력" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>주소 검색</button>
            </div>
          </label>
          <label>주소
            <input value={form.address} readOnly placeholder="주소 검색으로 입력" required />
          </label>
          <label>상세주소
            <input value={form.addressDetail} onChange={set('addressDetail')} placeholder="동, 호 등" />
          </label>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} style={{ width: 'auto' }} />
            기본 배송지로 설정
          </label>
          <div className="admin-item-row__actions">
            <button type="submit" className="btn btn-primary btn-sm">{editingId ? '저장' : '추가'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>취소</button>}
          </div>
        </form>
      </section>

      {showModal && <AddressSearchModal onSelect={handleAddressSelect} onClose={() => setShowModal(false)} />}
      <ConfirmDialog
        open={pendingId != null}
        title="배송지를 삭제하시겠어요?"
        onConfirm={() => { handleDelete(pendingId); setPendingId(null); }}
        onCancel={() => setPendingId(null)}
      />
    </>
  );
}
