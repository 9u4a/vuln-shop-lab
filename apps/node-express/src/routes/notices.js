const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toNotice(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;

  const where = q ? 'WHERE title LIKE ? OR body LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];

  const total = db.prepare(`SELECT COUNT(*) AS count FROM notices ${where}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM notices ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset);

  res.json({ notices: rows.map(toNotice), total, page, pageSize });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
  res.json({ notice: toNotice(row) });
});

router.post('/', requireAdmin, (req, res) => {
  const title = (req.body.title || '').trim();
  const body = (req.body.body || '').trim();
  if (!title || !body) {
    return res.status(400).json({ error: '제목과 내용은 필수입니다.' });
  }
  const imageUrl = req.body.imageUrl || null;
  const result = db.prepare('INSERT INTO notices (title, body, image_url) VALUES (?, ?, ?)').run(title, body, imageUrl);
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ notice: toNotice(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
  const title = req.body.title != null ? req.body.title.trim() : existing.title;
  const body = req.body.body != null ? req.body.body.trim() : existing.body;
  const imageUrl = req.body.imageUrl !== undefined ? (req.body.imageUrl || null) : existing.image_url;
  db.prepare('UPDATE notices SET title = ?, body = ?, image_url = ? WHERE id = ?').run(title, body, imageUrl, existing.id);
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(existing.id);
  res.json({ notice: toNotice(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
