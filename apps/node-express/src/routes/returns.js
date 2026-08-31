const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toReturn(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    username: row.username,
    reason: row.reason,
    status: row.status,
    refundAmount: row.refund_amount,
    createdAt: row.created_at,
  };
}

// 반품/환불 요청 — 주문 소유자·상태 검증 없이 접수한다.
router.post('/', requireAuth, (req, res) => {
  const { orderId, reason } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  const result = db
    .prepare('INSERT INTO returns (order_id, user_id, reason, status, refund_amount) VALUES (?, ?, ?, ?, ?)')
    .run(order.id, req.session.user.id, reason || null, 'requested', order.total_amount);
  res.status(201).json({ id: result.lastInsertRowid, status: 'requested' });
});

router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM returns WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.user.id);
  res.json({ returns: rows.map(toReturn) });
});

router.get('/', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, u.username FROM returns r
       JOIN users u ON u.id = r.user_id
       ORDER BY r.id DESC`
    )
    .all();
  res.json({ returns: rows.map(toReturn) });
});

// 관리자 환불 승인 — 이미 환불된 건에 대한 재승인을 막지 않는다.
router.put('/:id/approve', requireAdmin, (req, res) => {
  const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(req.params.id);
  if (!ret) return res.status(404).json({ error: '반품 요청을 찾을 수 없습니다.' });
  db.prepare("UPDATE returns SET status = 'refunded' WHERE id = ?").run(ret.id);
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(ret.refund_amount, ret.user_id);
  db.prepare('INSERT INTO point_transactions (user_id, amount, reason, order_id) VALUES (?, ?, ?, ?)').run(
    ret.user_id,
    ret.refund_amount,
    '반품 환불',
    ret.order_id
  );
  res.json({ ok: true, status: 'refunded', refundAmount: ret.refund_amount });
});

router.put('/:id/reject', requireAdmin, (req, res) => {
  const result = db.prepare("UPDATE returns SET status = 'rejected' WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '반품 요청을 찾을 수 없습니다.' });
  res.json({ ok: true, status: 'rejected' });
});

module.exports = router;
