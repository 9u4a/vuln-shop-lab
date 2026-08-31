const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.session.user.id);
  const transactions = db
    .prepare('SELECT id, amount, reason, order_id, created_at FROM point_transactions WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.user.id);
  res.json({
    balance: user ? user.points : 0,
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      reason: t.reason,
      orderId: t.order_id,
      createdAt: t.created_at,
    })),
  });
});

module.exports = router;
