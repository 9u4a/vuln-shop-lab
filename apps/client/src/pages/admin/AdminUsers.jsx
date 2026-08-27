import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../../BackendContext.jsx';
import { useSession } from '../../SessionContext.jsx';
import { fetchAdminUsers, fetchAdminUser, updateUserRole } from '../../api.js';
import { formatCurrency } from '../../format.js';
import StatusChip from '../../components/StatusChip.jsx';

const ROLES = ['user', 'admin', 'system_admin'];

export default function AdminUsers() {
  const { backend } = useBackend();
  const { user } = useSession();
  const isSystemAdmin = user?.role === 'system_admin';
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  function load() {
    setError(null);
    fetchAdminUsers(backend.base).then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);
  useEffect(() => { setOpenId(null); setDetail(null); }, [backend.base]);

  async function toggle(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await fetchAdminUser(backend.base, id);
      setDetail(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRoleChange(userId, role) {
    try {
      await updateUserRole(backend.base, userId, role);
      load();
      if (openId === userId) {
        const d = await fetchAdminUser(backend.base, userId);
        setDetail(d);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>사용자 <span className="muted">({users.length})</span></h2>
      {error && <p className="error">{error}</p>}
      {!isSystemAdmin && <p className="muted">권한 변경은 시스템 관리자만 가능합니다. 행을 눌러 상세 정보를 볼 수 있습니다.</p>}

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>아이디</th>
              <th>이름</th>
              <th>권한</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="row-toggle" onClick={() => toggle(u.id)}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.name || '-'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {isSystemAdmin ? (
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className="badge">{u.role}</span>
                  )}
                </td>
                <td>{(u.createdAt || u.created_at || '').slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId != null && (
        <div className="admin-detail">
          {detailLoading && <p className="muted">불러오는 중...</p>}
          {detail && (
            <>
              <dl>
                <dt>아이디</dt><dd>{detail.user.username}</dd>
                <dt>이름</dt><dd>{detail.user.name || '-'}</dd>
                <dt>전화</dt><dd>{detail.user.phone || '-'}</dd>
                <dt>우편번호</dt><dd>{detail.user.postcode || '-'}</dd>
                <dt>주소</dt><dd>{[detail.user.address, detail.user.addressDetail].filter(Boolean).join(' ') || '-'}</dd>
                <dt>자기소개</dt><dd>{detail.user.bio || '-'}</dd>
                <dt>가입일</dt><dd>{detail.user.createdAt || '-'}</dd>
              </dl>
              <h4>주문 내역 ({detail.orders.length})</h4>
              {detail.orders.length === 0 ? (
                <p className="muted">주문이 없습니다.</p>
              ) : (
                <ul className="order-list">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="order-row">
                      <Link to={`/admin/orders?open=${o.id}`} className="order-row__id">주문 #{o.id}</Link>
                      <StatusChip status={o.status} />
                      <span className="order-row__amount tnum">{formatCurrency(o.totalAmount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
