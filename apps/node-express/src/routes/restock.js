const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { productId, callbackUrl } = req.body;
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  const result = db
    .prepare('INSERT INTO restock_subscriptions (product_id, user_id, callback_url) VALUES (?, ?, ?)')
    .run(product.id, req.session.user.id, callbackUrl || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, p.name AS product_name FROM restock_subscriptions s
       JOIN products p ON p.id = s.product_id
       WHERE s.user_id = ? ORDER BY s.id DESC`
    )
    .all(req.session.user.id);
  res.json({ subscriptions: rows.map((s) => ({ id: s.id, productId: s.product_id, productName: s.product_name, callbackUrl: s.callback_url, createdAt: s.created_at })) });
});

router.get('/', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, p.name AS product_name, u.username FROM restock_subscriptions s
       JOIN products p ON p.id = s.product_id
       JOIN users u ON u.id = s.user_id
       ORDER BY s.id DESC`
    )
    .all();
  res.json({
    subscriptions: rows.map((s) => ({
      id: s.id,
      productId: s.product_id,
      productName: s.product_name,
      username: s.username,
      callbackUrl: s.callback_url,
      createdAt: s.created_at,
    })),
  });
});

// 재입고 통지 발송 — 구독자가 등록한 콜백 URL로 서버가 요청하고 그 응답을 그대로 반환한다.
router.post('/:id/send', requireAdmin, async (req, res) => {
  const sub = db.prepare('SELECT * FROM restock_subscriptions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: '구독을 찾을 수 없습니다.' });
  if (!sub.callback_url) return res.status(400).json({ error: '콜백 URL이 없습니다.' });
  try {
    const upstream = await fetch(sub.callback_url, { signal: AbortSignal.timeout(5000) });
    const body = await upstream.text();
    res.json({ ok: true, status: upstream.status, body: body.slice(0, 5000) });
  } catch (err) {
    res.status(502).json({ error: `콜백 요청 실패: ${err.message}` });
  }
});

module.exports = router;
