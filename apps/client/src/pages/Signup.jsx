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
  referralCode: '',
};

export default function Signup() {
  const { backend } = useBackend();
  const [form, setForm] = useState(emptyForm);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState({ terms: false, privacy: false, marketing: false });
  const navigate = useNavigate();

  const allAgreed = agree.terms && agree.privacy && agree.marketing;
  function toggleAll(checked) {
    setAgree({ terms: checked, privacy: checked, marketing: checked });
  }

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleAddressSelect(addr) {
    setForm((f) => ({ ...f, postcode: addr.zonecode, address: addr.address }));
    setShowAddressModal(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!agree.terms || !agree.privacy) {
      setError('필수 약관(이용약관·개인정보 수집·이용)에 동의해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signup(backend.base, form);
      navigate('/login');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page auth-wrap">
      <Link to="/" className="auth-brand">Vuln Shop</Link>
      <h1>회원가입</h1>
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
          <label>추천인 코드
            <input value={form.referralCode} onChange={update('referralCode')} placeholder="추천인 코드 (선택) 예: REFUSER1" />
          </label>
          <div className="agree-box">
            <label className="agree-box__all">
              <input type="checkbox" checked={allAgreed} onChange={(e) => toggleAll(e.target.checked)} />
              <strong>약관에 전체 동의합니다</strong>
            </label>
            <label className="agree-box__item">
              <input type="checkbox" checked={agree.terms} onChange={(e) => setAgree((a) => ({ ...a, terms: e.target.checked }))} />
              <span>[필수] <Link to="/terms" target="_blank">이용약관</Link>에 동의</span>
            </label>
            <label className="agree-box__item">
              <input type="checkbox" checked={agree.privacy} onChange={(e) => setAgree((a) => ({ ...a, privacy: e.target.checked }))} />
              <span>[필수] <Link to="/terms" target="_blank">개인정보 수집·이용</Link>에 동의</span>
            </label>
            <label className="agree-box__item">
              <input type="checkbox" checked={agree.marketing} onChange={(e) => setAgree((a) => ({ ...a, marketing: e.target.checked }))} />
              <span>[선택] 마케팅 정보 수신에 동의</span>
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '생성 중...' : '계정 생성'}</button>
        </form>
        <p className="muted">이미 계정이 있으신가요? <Link to="/login">로그인</Link></p>
      </section>
      {showAddressModal && (
        <AddressSearchModal onSelect={handleAddressSelect} onClose={() => setShowAddressModal(false)} />
      )}
    </div>
  );
}
