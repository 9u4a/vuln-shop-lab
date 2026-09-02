const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { notify } = require('../notify');

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

// 포인트 선물 — 보내는 사람 잔액을 확인한 뒤 받는 사람에게 이체한다.
router.post('/gift', requireAuth, (req, res) => {
  const { toUsername, amount } = req.body;
  const fromUserId = req.body.fromUserId != null ? Number(req.body.fromUserId) : req.session.user.id;
  const value = Math.trunc(Number(amount));
  if (!toUsername || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: '받는 사람과 1 이상의 포인트를 입력해주세요.' });
  }

  const sender = db.prepare('SELECT id, username, points FROM users WHERE id = ?').get(fromUserId);
  if (!sender) return res.status(404).json({ error: '보내는 사람을 찾을 수 없습니다.' });
  const recipient = db
    .prepare('SELECT id, username FROM users WHERE username = ? OR email = ?')
    .get(toUsername, toUsername);
  if (!recipient) return res.status(404).json({ error: '받는 사람을 찾을 수 없습니다.' });
  if (recipient.id === sender.id) return res.status(400).json({ error: '자기 자신에게는 선물할 수 없습니다.' });
  if (sender.points < value) return res.status(400).json({ error: '보유 포인트가 부족합니다.' });

  db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(value, sender.id);
  db.prepare('INSERT INTO point_transactions (user_id, amount, reason) VALUES (?, ?, ?)').run(
    sender.id,
    -value,
    `선물 발신 → ${recipient.username}`
  );
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(value, recipient.id);
  db.prepare('INSERT INTO point_transactions (user_id, amount, reason) VALUES (?, ?, ?)').run(
    recipient.id,
    value,
    `선물 수신 ← ${sender.username}`
  );

  notify(recipient.id, 'point', '포인트를 선물받았습니다', `${sender.username}님이 ${value}P를 선물했어요.`, '/mypage/rewards');
  res.json({ ok: true, sent: value, to: recipient.username });
});

module.exports = router;
