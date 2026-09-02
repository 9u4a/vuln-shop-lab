import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { useSession } from '../../SessionContext.jsx';
import { fetchAdminStats, broadcastNotification } from '../../api.js';

const STAT_LABELS = {
  users: '사용자',
  orders: '주문',
  products: '상품',
  faqs: 'FAQ',
  notices: '공지사항',
};

export default function AdminSettings() {
  const { backend } = useBackend();
  const { user } = useSession();
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);
  const [notif, setNotif] = useState({ title: '', body: '', link: '' });
  const [notifMsg, setNotifMsg] = useState(null);

  async function handleBroadcast(e) {
    e.preventDefault();
    setNotifMsg(null);
    try {
      const res = await broadcastNotification(backend.base, notif);
      setNotif({ title: '', body: '', link: '' });
      setNotifMsg(`${res.sent}명에게 알림을 발송했습니다.`);
    } catch (err) {
      setNotifMsg(err.message);
    }
  }

  useEffect(() => {
    setCounts(null);
    setError(null);
    fetchAdminStats(backend.base)
      .then(setCounts)
      .catch((err) => setError(err.message));
  }, [backend.base]);

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>개요</h2>
        {!counts ? (
          <p className="muted">불러오는 중...</p>
        ) : (
          <ul className="admin-stat-grid">
            {Object.entries(STAT_LABELS).map(([key, label]) => (
              <li key={key} className="admin-stat">
                <div className="admin-stat__label">{label}</div>
                <div className="admin-stat__value">{counts[key] ?? '-'}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>전체 알림 발송</h2>
        <p className="muted">모든 회원에게 인앱 알림(종 아이콘)을 보냅니다.</p>
        <form onSubmit={handleBroadcast}>
          <label>제목
            <input value={notif.title} onChange={(e) => setNotif((n) => ({ ...n, title: e.target.value }))} required />
          </label>
          <label>내용
            <textarea value={notif.body} onChange={(e) => setNotif((n) => ({ ...n, body: e.target.value }))} rows="2" />
          </label>
          <label>링크 (선택)
            <input value={notif.link} onChange={(e) => setNotif((n) => ({ ...n, link: e.target.value }))} placeholder="/events" />
          </label>
          <button type="submit" className="btn btn-primary">발송</button>
        </form>
        {notifMsg && <p className="status-ok">{notifMsg}</p>}
      </section>

      <section className="card">
        <h2>권한 등급</h2>
        <ul className="activity-list">
          <li><span className="badge">user</span> — 상품 조회, 장바구니, 주문, 리뷰, 본인 프로필 관리.</li>
          <li><span className="badge">admin</span> — user의 모든 권한에 더해 상품/FAQ/공지사항 관리, 사용자·주문 조회.</li>
          <li><span className="badge">system_admin</span> — admin의 모든 권한에 더해 사용자 권한 변경.</li>
        </ul>
        {user?.role !== 'system_admin' && (
          <p className="muted">현재 <strong>{user?.role}</strong> 권한으로 로그인되어 있습니다 — 사용자 탭의 권한 변경은 시스템 관리자만 가능합니다.</p>
        )}
      </section>
    </div>
  );
}
