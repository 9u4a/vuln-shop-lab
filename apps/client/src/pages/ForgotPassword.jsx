import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { forgotPassword } from '../api.js';

export default function ForgotPassword() {
  const { backend } = useBackend();
  const [account, setAccount] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await forgotPassword(backend.base, account);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page auth-wrap">
      <Link to="/" className="auth-brand">Vuln Shop</Link>
      <h1>비밀번호 찾기</h1>
      <section className="card">
        {error && <p className="error">{error}</p>}
        {result ? (
          <>
            <p>{result.message}</p>
            <p className="muted">데모 환경에서는 메일 발송 대신 재설정 링크를 바로 안내합니다.</p>
            <p>
              <Link to={`/reset-password?token=${encodeURIComponent(result.resetToken)}`} className="btn btn-primary">
                비밀번호 재설정하기
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>아이디 또는 이메일
              <input value={account} onChange={(e) => setAccount(e.target.value)} required />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? '확인 중...' : '재설정 링크 받기'}
            </button>
          </form>
        )}
        <p className="muted"><Link to="/login">로그인으로 돌아가기</Link></p>
      </section>
    </div>
  );
}
