import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackend } from '../BackendContext.jsx';
import { useSession } from '../SessionContext.jsx';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api.js';

export default function NotificationBell() {
  const { backend } = useBackend();
  const { user } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const ref = useRef(null);

  function loadCount() {
    if (!user) { setCount(0); return; }
    fetchUnreadNotificationCount(backend.base).then((d) => setCount(d.count || 0)).catch(() => setCount(0));
  }

  useEffect(loadCount, [backend.base, user]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const d = await fetchNotifications(backend.base);
        setItems(d.notifications || []);
      } catch {
        setItems([]);
      }
    }
  }

  async function handleClick(n) {
    try { await markNotificationRead(backend.base, n.id); } catch { /* ignore */ }
    loadCount();
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleReadAll() {
    try { await markAllNotificationsRead(backend.base); } catch { /* ignore */ }
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setCount(0);
  }

  if (!user) return null;

  return (
    <div className="notif-bell" ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="icon-link" aria-label="알림" onClick={toggle}
        style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
        <span className="icon-link__glyph">🔔</span>
        {count > 0 && <span className="count-badge">{count}</span>}
      </button>
      {open && (
        <div className="notif-dropdown" style={{
          position: 'absolute', right: 0, top: '100%', width: 320, maxHeight: 420, overflowY: 'auto',
          background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e5e5e5)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, padding: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
            <strong>알림</strong>
            <button type="button" className="link-plain" onClick={handleReadAll}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85em' }}>모두 읽음</button>
          </div>
          {items.length === 0 ? (
            <p className="muted" style={{ padding: '8px 12px' }}>알림이 없습니다.</p>
          ) : (
            items.map((n) => (
              <button key={n.id} type="button" onClick={() => handleClick(n)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                  border: 'none', borderTop: '1px solid var(--color-border, #f0f0f0)',
                  background: n.read ? 'transparent' : 'rgba(0,0,0,0.03)', cursor: 'pointer',
                }}>
                <strong style={{ display: 'block', fontSize: '0.9em' }}>{n.title}</strong>
                {n.body && (
                  <span className="notif-body" style={{ fontSize: '0.85em', color: 'var(--color-text-muted, #666)' }}
                    dangerouslySetInnerHTML={{ __html: n.body }} />
                )}
                <span style={{ display: 'block', fontSize: '0.75em', color: '#999' }}>{(n.createdAt || '').slice(0, 16).replace('T', ' ')}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
