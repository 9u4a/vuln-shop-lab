import { useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { verifyPassword, changePassword } from '../../api.js';

export default function MyPagePassword() {
  const { backend } = useBackend();
  const [unlocked, setUnlocked] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [verifyError, setVerifyError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState(null);
  const [status, setStatus] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError(null);
    setVerifying(true);
    try {
      await verifyPassword(backend.base, currentPassword);
      setUnlocked(true);
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleChange(e) {
    e.preventDefault();
    setChangeError(null);
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setChangeError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      await changePassword(backend.base, currentPassword, newPassword);
      setStatus('비밀번호가 성공적으로 변경되었습니다.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setChangeError(err.message);
    }
  }

  if (!unlocked) {
    return (
      <section className="card">
        <h2>본인 확인</h2>
        <p className="muted">보안을 위해 계속하려면 현재 비밀번호를 다시 입력해주세요.</p>
        {verifyError && <p className="error">{verifyError}</p>}
        <form onSubmit={handleVerify}>
          <label>현재 비밀번호
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={verifying}>
            {verifying ? '확인 중...' : '계속'}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>비밀번호 변경</h2>
      {status && <p className="status-ok">{status}</p>}
      {changeError && <p className="error">{changeError}</p>}
      <form onSubmit={handleChange}>
        <label>새 비밀번호
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>
        <label>새 비밀번호 확인
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary">비밀번호 변경</button>
      </form>
    </section>
  );
}
