const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toFaq(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM faqs ORDER BY id').all();
  res.json({ faqs: rows.map(toFaq) });
});

router.post('/', requireAdmin, (req, res) => {
  const question = (req.body.question || '').trim();
  const answer = (req.body.answer || '').trim();
  if (!question || !answer) {
    return res.status(400).json({ error: 'question and answer are required.' });
  }
  const result = db.prepare('INSERT INTO faqs (question, answer) VALUES (?, ?)').run(question, answer);
  const row = db.prepare('SELECT * FROM faqs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ faq: toFaq(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM faqs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'FAQ not found' });
  const question = req.body.question != null ? req.body.question.trim() : existing.question;
  const answer = req.body.answer != null ? req.body.answer.trim() : existing.answer;
  db.prepare('UPDATE faqs SET question = ?, answer = ? WHERE id = ?').run(question, answer, existing.id);
  const row = db.prepare('SELECT * FROM faqs WHERE id = ?').get(existing.id);
  res.json({ faq: toFaq(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'FAQ not found' });
  res.json({ ok: true });
});

module.exports = router;
