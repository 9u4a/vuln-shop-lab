import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { useSession } from '../../SessionContext.jsx';
import { fetchAdminStats } from '../../api.js';

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
