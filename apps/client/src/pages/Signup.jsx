import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { signup } from '../api.js';
import AddressSearchModal from '../components/AddressSearchModal.jsx';

const emptyForm = {
  username: '',
  password: '',
  name: '',
  phone: '',
  postcode: '',
  address: '',
  addressDetail: '',
};

export default function Signup() {
  const { backend } = useBackend();
  const [form, setForm] = useState(emptyForm);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleAddressSelect(addr) {
    setForm((f) => ({ ...f, postcode: addr.zonecode, address: addr.address }));
    setShowAddressModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await signup(backend.base, form);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>회원가입</h1>
      </div>
      <section className="card">
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>아이디
            <input value={form.username} onChange={update('username')} required />
          </label>
          <label>비밀번호
            <input type="password" value={form.password} onChange={update('password')} required />
          </label>
          <label>이름
            <input value={form.name} onChange={update('name')} required />
          </label>
          <label>전화번호
            <input value={form.phone} onChange={update('phone')} placeholder="010-1234-5678" required />
          </label>
          <label>우편번호
            <div className="address-row">
              <input value={form.postcode} readOnly placeholder="주소 검색으로 입력" required />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddressModal(true)}>
                주소 검색
              </button>
            </div>
          </label>
          <label>주소
            <input value={form.address} readOnly placeholder="주소 검색으로 입력" required />
          </label>
          <label>상세주소
            <input value={form.addressDetail} onChange={update('addressDetail')} placeholder="동, 호 등 (선택)" />
          </label>
          <button type="submit" className="btn btn-primary">계정 생성</button>
        </form>
        <p className="muted">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
      </section>
      {showAddressModal && (
        <AddressSearchModal onSelect={handleAddressSelect} onClose={() => setShowAddressModal(false)} />
      )}
    </div>
  );
}
