const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toFaq(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    authorUsername: row.author_username || null,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
  const offset = (page - 1) * pageSize;

  const where = q ? 'WHERE f.question LIKE ? OR f.answer LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];

  const total = db.prepare(`SELECT COUNT(*) AS count FROM faqs f ${where}`).get(...params).count;
  const rows = db
    .prepare(
      `SELECT f.*, u.username AS author_username FROM faqs f
       LEFT JOIN users u ON u.id = f.user_id
       ${where}
       ORDER BY f.id LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({ faqs: rows.map(toFaq), total, page, pageSize });
});

router.post('/', requireAdmin, (req, res) => {
  const question = (req.body.question || '').trim();
  const answer = (req.body.answer || '').trim();
  if (!question || !answer) {
    return res.status(400).json({ error: '질문과 답변은 필수입니다.' });
  }
  const result = db
    .prepare('INSERT INTO faqs (question, answer, user_id) VALUES (?, ?, ?)')
    .run(question, answer, req.session.user.id);
  const row = db
    .prepare(
      `SELECT f.*, u.username AS author_username FROM faqs f
       LEFT JOIN users u ON u.id = f.user_id WHERE f.id = ?`
    )
    .get(result.lastInsertRowid);
  res.status(201).json({ faq: toFaq(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM faqs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'FAQ를 찾을 수 없습니다.' });
  const question = req.body.question != null ? req.body.question.trim() : existing.question;
  const answer = req.body.answer != null ? req.body.answer.trim() : existing.answer;
  db.prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?').run(question, answer, existing.id);
  const row = db
    .prepare(
      `SELECT f.*, u.username AS author_username FROM faqs f
       LEFT JOIN users u ON u.id = f.user_id WHERE f.id = ?`
    )
    .get(existing.id);
  res.json({ faq: toFaq(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'FAQ를 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
