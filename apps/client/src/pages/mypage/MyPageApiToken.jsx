import { useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { issueApiToken } from '../../api.js';

export default function MyPageApiToken() {
  const { backend } = useBackend();
  const { showToast } = useToast();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleIssue() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await issueApiToken(backend.base);
      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyToken() {
    navigator.clipboard?.writeText(token).then(() => showToast('토큰을 복사했습니다.'));
  }

  return (
    <section className="card">
      <h2>API 토큰 (JWT)</h2>
      <p className="muted">
        외부 연동·모바일 앱에서 사용할 Bearer 토큰을 발급합니다.
        <code>Authorization: Bearer &lt;token&gt;</code> 헤더로 <code>GET /api/auth/whoami</code>에 전달하세요.
      </p>
      {error && <p className="error">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={handleIssue} disabled={busy}>
        {busy ? '발급 중...' : '토큰 발급'}
      </button>
      {token && (
        <div className="form-field" style={{ marginTop: '1rem' }}>
          <label>발급된 토큰
            <textarea readOnly value={token} rows={4} style={{ width: '100%', fontFamily: 'monospace', wordBreak: 'break-all' }} />
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copyToken}>복사</button>
        </div>
      )}
    </section>
  );
}
