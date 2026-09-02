import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { resetPassword } from '../api.js';

export default function ResetPassword() {
  const { backend } = useBackend();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (newPassword.length < 8) {
      setError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(backend.base, token, newPassword);
      showToast('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page auth-wrap">
      <Link to="/" className="auth-brand">Vuln Shop</Link>
      <h1>비밀번호 재설정</h1>
      <section className="card">
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label>재설정 토큰
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </label>
          <label>새 비밀번호
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          <label>새 비밀번호 확인
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
        <p className="muted"><Link to="/login">로그인으로 돌아가기</Link></p>
      </section>
    </div>
  );
}
