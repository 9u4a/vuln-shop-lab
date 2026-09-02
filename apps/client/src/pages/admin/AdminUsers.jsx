import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBackend } from '../../BackendContext.jsx';
import { useSession } from '../../SessionContext.jsx';
import { fetchAdminUsers, fetchAdminUser, updateUserRole, updateUserTier, toggleUserActive, updateAdminUser } from '../../api.js';
import { formatCurrency } from '../../format.js';
import StatusChip from '../../components/StatusChip.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';

const ROLES = ['user', 'admin', 'system_admin'];
const TIERS = ['basic', 'silver', 'gold', 'vip'];
const PAGE_SIZE = 10;
const emptyEdit = { name: '', phone: '', postcode: '', address: '', addressDetail: '', bio: '' };

export default function AdminUsers() {
  const { backend } = useBackend();
  const { user } = useSession();
  const isSystemAdmin = user?.role === 'system_admin';
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [edit, setEdit] = useState(emptyEdit);
  const [saveStatus, setSaveStatus] = useState(null);

  function load() {
    setError(null);
    fetchAdminUsers(backend.base).then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);
  useEffect(() => { setOpenId(null); setDetail(null); setPage(1); }, [backend.base]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) =>
        String(u.id) === q ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q))
    : users;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function openDetail(id) {
    setOpenId(id);
    setDetail(null);
    setSaveStatus(null);
    setDetailLoading(true);
    try {
      const d = await fetchAdminUser(backend.base, id);
      setDetail(d);
      setEdit({
        name: d.user.name || '', phone: d.user.phone || '', postcode: d.user.postcode || '',
        address: d.user.address || '', addressDetail: d.user.addressDetail || '', bio: d.user.bio || '',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() { setOpenId(null); setDetail(null); }

  async function handleToggleActive(userId, active) {
    setError(null);
    try {
      await toggleUserActive(backend.base, userId, active);
      load();
      if (openId === userId) setDetail((d) => ({ ...d, user: { ...d.user, active } }));
    } catch (err) { setError(err.message); }
  }

  async function handleRoleChange(userId, role) {
    try {
      await updateUserRole(backend.base, userId, role);
      load();
      if (openId === userId) setDetail((d) => ({ ...d, user: { ...d.user, role } }));
    } catch (err) { setError(err.message); }
  }

  async function handleTierChange(userId, membershipTier) {
    try {
      await updateUserTier(backend.base, userId, membershipTier);
      load();
      if (openId === userId) setDetail((d) => ({ ...d, user: { ...d.user, membershipTier } }));
    } catch (err) { setError(err.message); }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaveStatus(null);
    try {
      await updateAdminUser(backend.base, openId, edit);
      setSaveStatus('저장되었습니다.');
      setDetail((d) => ({ ...d, user: { ...d.user, ...edit } }));
      load();
    } catch (err) { setSaveStatus(err.message); }
  }

  const setField = (f) => (e) => setEdit((v) => ({ ...v, [f]: e.target.value }));

  return (
    <section className="card">
      <h2>사용자 <span className="muted">({users.length})</span></h2>
      {error && <p className="error">{error}</p>}
      <p className="muted">행을 눌러 상세 정보를 보고 프로필을 수정할 수 있습니다.{!isSystemAdmin && ' 권한 변경은 시스템 관리자만 가능합니다.'}</p>

      <div className="admin-toolbar">
        <input
          className="admin-search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="아이디·이름·권한 검색"
        />
        {q && <span className="muted">{filtered.length}명</span>}
      </div>

      <div className="admin-table__wrap">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>아이디</th><th>이름</th><th>권한</th><th>상태</th><th>가입일</th></tr>
          </thead>
          <tbody>
            {paged.map((u) => (
              <tr key={u.id} className="row-toggle" onClick={() => openDetail(u.id)}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.name || '-'}</td>
                <td><span className="badge">{u.role}</span></td>
                <td>
                  <span className={u.active === false ? 'badge badge-danger' : 'badge badge-ok'}>
                    {u.active === false ? '비활성' : '활성'}
                  </span>
                </td>
                <td>{(u.createdAt || u.created_at || '').slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />

      <Modal open={openId != null} title="사용자 상세" onClose={closeModal} wide>
        {detailLoading && <p className="muted">불러오는 중...</p>}
        {detail && (
          <>
            <div className="admin-modal__grid">
              <div>
                <p className="muted">아이디</p>
                <p><strong>{detail.user.username}</strong></p>
              </div>
              <div>
                <p className="muted">권한</p>
                {isSystemAdmin ? (
                  <select value={detail.user.role} onChange={(e) => handleRoleChange(detail.user.id, e.target.value)}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : <span className="badge">{detail.user.role}</span>}
              </div>
              <div>
                <p className="muted">회원 등급</p>
                <select value={detail.user.membershipTier || 'basic'} onChange={(e) => handleTierChange(detail.user.id, e.target.value)}>
                  {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="admin-modal__status">
                <p className="muted">상태</p>
                <span className={detail.user.active === false ? 'badge badge-danger' : 'badge badge-ok'}>
                  {detail.user.active === false ? '비활성' : '활성'}
                </span>
                <button type="button" className="btn btn-ghost btn-sm"
                  onClick={() => handleToggleActive(detail.user.id, detail.user.active === false)}>
                  {detail.user.active === false ? '활성화' : '비활성화'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <label>이름<input value={edit.name} onChange={setField('name')} /></label>
              <label>전화<input value={edit.phone} onChange={setField('phone')} /></label>
              <label>우편번호<input value={edit.postcode} onChange={setField('postcode')} /></label>
              <label>주소<input value={edit.address} onChange={setField('address')} /></label>
              <label>상세주소<input value={edit.addressDetail} onChange={setField('addressDetail')} /></label>
              <label>자기소개<textarea value={edit.bio} onChange={setField('bio')} rows="2" /></label>
              {saveStatus && <p className={saveStatus === '저장되었습니다.' ? 'status-ok' : 'error'}>{saveStatus}</p>}
              <button type="submit" className="btn btn-primary">프로필 저장</button>
            </form>

            <h4>주문 내역 ({detail.orders.length})</h4>
            {detail.orders.length === 0 ? (
              <p className="muted">주문이 없습니다.</p>
            ) : (
              <ul className="order-list">
                {detail.orders.map((o) => (
                  <li key={o.id} className="order-row">
                    <Link to={`/admin/orders?open=${o.id}`} className="order-row__id" onClick={closeModal}>주문 #{o.id}</Link>
                    <StatusChip status={o.status} />
                    <span className="order-row__amount tnum">{formatCurrency(o.totalAmount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal>
    </section>
  );
}
