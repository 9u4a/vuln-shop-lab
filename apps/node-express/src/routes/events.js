const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toEvent(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    active: !!row.active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

// Public — active events currently within their publish window.
router.get('/', (req, res) => {
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT * FROM events
       WHERE active = 1
         AND (starts_at IS NULL OR starts_at <= ?)
         AND (ends_at IS NULL OR ends_at >= ?)
       ORDER BY id DESC`
    )
    .all(now, now);
  res.json({ events: rows.map(toEvent) });
});

// Admin — every event regardless of status/window.
router.get('/manage', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY id DESC').all();
  res.json({ events: rows.map(toEvent) });
});

router.post('/', requireAdmin, (req, res) => {
  const { title, body, imageUrl, linkUrl, active, startsAt, endsAt } = req.body;
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: '제목은 필수입니다.' });
  }
  const result = db
    .prepare(
      `INSERT INTO events (title, body, image_url, link_url, active, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(title).trim(),
      body || null,
      imageUrl || null,
      linkUrl || null,
      active === false ? 0 : 1,
      startsAt || null,
      endsAt || null
    );
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ event: toEvent(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
  const { title, body, imageUrl, linkUrl, active, startsAt, endsAt } = req.body;
  db.prepare(
    `UPDATE events SET title = ?, body = ?, image_url = ?, link_url = ?, active = ?, starts_at = ?, ends_at = ?
     WHERE id = ?`
  ).run(
    title != null ? String(title).trim() : existing.title,
    body !== undefined ? body || null : existing.body,
    imageUrl !== undefined ? imageUrl || null : existing.image_url,
    linkUrl !== undefined ? linkUrl || null : existing.link_url,
    active != null ? (active ? 1 : 0) : existing.active,
    startsAt !== undefined ? startsAt || null : existing.starts_at,
    endsAt !== undefined ? endsAt || null : existing.ends_at,
    existing.id
  );
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(existing.id);
  res.json({ event: toEvent(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
