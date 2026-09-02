const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    read: !!row.read_at,
    createdAt: row.created_at,
  };
}

// 내 알림 목록.
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(req.session.user.id);
  res.json({ notifications: rows.map(toNotification) });
});

// 미확인 개수.
router.get('/unread-count', requireAuth, (req, res) => {
  const c = db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .get(req.session.user.id).c;
  res.json({ count: c });
});

// 단건 읽음 처리.
router.post('/:id/read', requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?").run(
    req.params.id,
    req.session.user.id
  );
  res.json({ ok: true });
});

// 전체 읽음 처리.
router.post('/read-all', requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(
    req.session.user.id
  );
  res.json({ ok: true });
});

// 관리자 — 전체 사용자에게 알림 브로드캐스트.
router.post('/broadcast', requireAdmin, (req, res) => {
  const { title, body, link } = req.body;
  if (!title) return res.status(400).json({ error: '제목은 필수입니다.' });
  const userIds = db.prepare('SELECT id FROM users').all().map((u) => u.id);
  const insert = db.prepare(
    'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)'
  );
  for (const uid of userIds) {
    insert.run(uid, 'notice', title, body || null, link || null);
  }
  res.status(201).json({ ok: true, sent: userIds.length });
});

module.exports = router;
