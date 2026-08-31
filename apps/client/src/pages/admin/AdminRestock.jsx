import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { fetchAdminRestock, notifyRestock, testIntegrationWebhook, fetchStoreSettings, saveStoreSettings } from '../../api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 10;

export default function AdminRestock() {
  const { backend } = useBackend();
  const [subs, setSubs] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [page, setPage] = useState(1);
  const [hookUrl, setHookUrl] = useState('');
  const [hookResult, setHookResult] = useState(null);
  const [hookSaved, setHookSaved] = useState(null);

  function load() {
    setError(null);
    fetchAdminRestock(backend.base).then((d) => setSubs(d.subscriptions)).catch((e) => setError(e.message));
    fetchStoreSettings(backend.base)
      .then((d) => setHookUrl(d.notificationWebhookUrl || ''))
      .catch(() => {});
  }

  useEffect(load, [backend.base]);

  async function handleSaveWebhook() {
    setHookSaved(null);
    setError(null);
    try {
      await saveStoreSettings(backend.base, { notificationWebhookUrl: hookUrl });
      setHookSaved('연동 웹훅이 저장되었습니다.');
    } catch (err) {
      setError(err.message);
    }
  }

  const paged = subs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleNotify(productId, productName) {
    setStatus(null);
    try {
      const res = await notifyRestock(backend.base, productId);
      setStatus(`"${productName}" 구독자 ${res.notified}명에게 재입고 알림을 발송했습니다.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTestWebhook(e) {
    e.preventDefault();
    setHookResult(null);
    setError(null);
    try {
      const res = await testIntegrationWebhook(backend.base, hookUrl);
      setHookResult({ status: res.status, body: res.body });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <section className="card">
        <div className="admin-toolbar">
          <h2>재입고 알림 구독 <span className="muted">({subs.length})</span></h2>
        </div>
        {error && <p className="error">{error}</p>}
        {status && <p className="status-ok">{status}</p>}
        <div className="admin-table__wrap">
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>상품</th><th>회원</th><th>상태</th><th>발송</th></tr>
            </thead>
            <tbody>
              {paged.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.productName}</td>
                  <td>{s.username}</td>
                  <td>{s.notified ? '발송됨' : '대기'}</td>
                  <td>
                    <button type="button" onClick={() => handleNotify(s.productId, s.productName)} disabled={s.notified}>
                      재입고 알림 발송
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={subs.length} onChange={setPage} />
      </section>

      <section className="card">
        <h2>알림 연동 웹훅</h2>
        <p className="muted">재입고·주문 알림을 Slack/ERP 등 외부 시스템으로 전달할 웹훅을 설정하고 테스트 요청을 보냅니다.</p>
        <form onSubmit={handleTestWebhook}>
          <label>웹훅 URL
            <input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://hooks.example.com/..." />
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" onClick={handleSaveWebhook} className="btn btn-ghost">저장</button>
            <button type="submit" className="btn btn-primary">테스트 요청</button>
          </div>
        </form>
        {hookSaved && <p className="status-ok">{hookSaved}</p>}
        {hookResult && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h3>응답 (status {hookResult.status})</h3>
            <pre style={{ background: 'var(--color-subtle)', padding: 'var(--space-4)', borderRadius: 'var(--radius)', overflowX: 'auto' }}>{hookResult.body}</pre>
          </div>
        )}
      </section>
    </>
  );
}
