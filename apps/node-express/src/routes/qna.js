const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ADMIN_ROLES = new Set(['admin', 'system_admin']);

function toListItem(row) {
  return {
    id: row.id,
    title: row.title,
    authorUsername: row.username || null,
    secret: !!row.secret,
    answered: !!row.answer,
    createdAt: row.created_at,
  };
}

function toDetail(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    secret: !!row.secret,
    authorUsername: row.username || null,
    answer: row.answer || null,
    answeredBy: row.answered_by || null,
    answeredAt: row.answered_at || null,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;

  const where = q ? 'WHERE title LIKE ?' : '';
  const params = q ? [`%${q}%`] : [];

  const total = db.prepare(`SELECT COUNT(*) AS count FROM questions ${where}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM questions ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({ questions: rows.map(toListItem), total, page, pageSize });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
  res.json({ question: toDetail(row) });
});

router.post('/', requireAuth, (req, res) => {
  const title = (req.body.title || '').trim();
  const body = (req.body.body || '').trim();
  const secret = req.body.secret === true || req.body.secret === 'true' ? 1 : 0;
  if (!title || !body) {
    return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
  }
  const result = db
    .prepare('INSERT INTO questions (user_id, username, title, body, secret) VALUES (?, ?, ?, ?, ?)')
    .run(req.session.user.id, req.session.user.username, title, body, secret);
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ question: toDetail(row) });
});

router.put('/:id/answer', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
  const answer = (req.body.answer || '').trim();
  if (!answer) return res.status(400).json({ error: '답변 내용은 필수입니다.' });
  db.prepare("UPDATE questions SET answer = ?, answered_by = ?, answered_at = datetime('now') WHERE id = ?")
    .run(answer, req.session.user.username, existing.id);
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(existing.id);
  res.json({ question: toDetail(row) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
  const isOwner = existing.user_id === req.session.user.id;
  const isAdmin = ADMIN_ROLES.has(req.session.user.role);
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  }
  db.prepare('DELETE FROM questions WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

module.exports = router;
