import { useEffect, useState } from 'react';
import { useBackend } from '../../BackendContext.jsx';
import { useSession } from '../../SessionContext.jsx';
import { fetchAdminUsers, updateUserRole } from '../../api.js';

export default function AdminUsers() {
  const { backend } = useBackend();
  const { user } = useSession();
  const isSystemAdmin = user?.role === 'system_admin';
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  function load() {
    setError(null);
    fetchAdminUsers(backend.base).then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }

  useEffect(load, [backend.base]);

  async function handleRoleChange(userId, role) {
    try {
      await updateUserRole(backend.base, userId, role);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>사용자</h2>
      {error && <p className="error">{error}</p>}
      {!isSystemAdmin && <p className="muted">시스템 관리자만 권한을 변경할 수 있습니다.</p>}
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.username} <span className="badge">{u.role}</span>
            {isSystemAdmin ? (
              <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="system_admin">system_admin</option>
              </select>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
