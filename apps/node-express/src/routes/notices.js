const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toNotice(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notices ORDER BY id DESC').all();
  res.json({ notices: rows.map(toNotice) });
});

router.post('/', requireAdmin, (req, res) => {
  const title = (req.body.title || '').trim();
  const body = (req.body.body || '').trim();
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required.' });
  }
  const result = db.prepare('INSERT INTO notices (title, body) VALUES (?, ?)').run(title, body);
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ notice: toNotice(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Notice not found' });
  const title = req.body.title != null ? req.body.title.trim() : existing.title;
  const body = req.body.body != null ? req.body.body.trim() : existing.body;
  db.prepare('UPDATE notices SET title = ?, body = ? WHERE id = ?').run(title, body, existing.id);
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(existing.id);
  res.json({ notice: toNotice(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Notice not found' });
  res.json({ ok: true });
});

module.exports = router;
