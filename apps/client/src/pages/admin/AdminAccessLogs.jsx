import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchLoginLogs } from '../../api.js';

const SUCCESS_FILTERS = [
  { value: '', label: '전체' },
  { value: '1', label: '성공' },
  { value: '0', label: '실패' },
];

export default function AdminAccessLogs() {
  const { backend } = useBackend();
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    setError(null);
    fetchLoginLogs(backend.base, { username: username.trim(), success })
      .then((d) => setLogs(d.logs))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base, success]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="card">
      <h2>접속 로그 <span className="muted">({logs.length})</span></h2>
      <p className="muted">로그인 시도(성공/실패) 기록입니다. 최근 200건까지 표시됩니다.</p>
      {error && <p className="error">{error}</p>}

      <form
        className="search-row"
        onSubmit={(e) => { e.preventDefault(); load(); }}
        style={{ marginBottom: 'var(--space-4)' }}
      >
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="아이디로 검색" />
        <select value={success} onChange={(e) => setSuccess(e.target.value)} aria-label="결과 필터">
          {SUCCESS_FILTERS.map((f) => <option key={f.value || 'all'} value={f.value}>{f.label}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm">검색</button>
      </form>

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>시각</th>
              <th>아이디</th>
              <th>결과</th>
              <th>IP</th>
              <th>User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{(l.at || '').replace('T', ' ').slice(0, 19)}</td>
                <td>{l.username || '-'}</td>
                <td>
                  <span className={l.success ? 'badge badge-ok' : 'badge badge-danger'}>
                    {l.success ? '성공' : '실패'}
                  </span>
                </td>
                <td>{l.ip || '-'}</td>
                <td className="access-log__ua" dangerouslySetInnerHTML={{ __html: l.userAgent || '-' }} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length === 0 && <p className="muted">기록이 없습니다.</p>}
    </section>
  );
}
