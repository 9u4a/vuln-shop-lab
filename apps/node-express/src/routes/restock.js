const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 품절 상품 재입고 알림 신청 — 사용자는 버튼 한 번으로 신청(같은 상품 중복 신청은 무시).
router.post('/', requireAuth, (req, res) => {
  const { productId } = req.body;
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  const existing = db
    .prepare('SELECT id FROM restock_subscriptions WHERE product_id = ? AND user_id = ?')
    .get(product.id, req.session.user.id);
  if (existing) return res.json({ id: existing.id, already: true });
  const result = db
    .prepare('INSERT INTO restock_subscriptions (product_id, user_id) VALUES (?, ?)')
    .run(product.id, req.session.user.id);
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
  res.json({
    subscriptions: rows.map((s) => ({
      id: s.id,
      productId: s.product_id,
      productName: s.product_name,
      notified: !!s.notified,
      createdAt: s.created_at,
    })),
  });
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
      notified: !!s.notified,
      createdAt: s.created_at,
    })),
  });
});

// 재입고 알림 발송 — 인앱 통지 처리(해당 상품 구독자 모두 notified 처리).
router.post('/notify/:productId', requireAdmin, (req, res) => {
  const result = db
    .prepare('UPDATE restock_subscriptions SET notified = 1 WHERE product_id = ? AND notified = 0')
    .run(req.params.productId);
  res.json({ ok: true, notified: result.changes });
});

module.exports = router;
