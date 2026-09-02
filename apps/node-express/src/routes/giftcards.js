const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toGiftCard(row) {
  return {
    id: row.id,
    code: row.code,
    balance: row.balance,
    initialBalance: row.initial_balance,
    active: !!row.active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

// 코드로 상품권 잔액 조회.
router.get('/lookup/:code', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM gift_cards WHERE code = ?').get(String(req.params.code).trim());
  if (!row) return res.status(404).json({ error: '상품권을 찾을 수 없습니다.' });
  res.json({ giftCard: toGiftCard(row) });
});

// 상품권 등록 — 잔액을 적립금(포인트)으로 전환한다.
router.post('/redeem', requireAuth, (req, res) => {
  const code = (req.body.code || '').trim();
  if (!code) return res.status(400).json({ error: '상품권 코드를 입력해주세요.' });
  const card = db.prepare('SELECT * FROM gift_cards WHERE code = ?').get(code);
  if (!card || !card.active) return res.status(404).json({ error: '유효하지 않은 상품권입니다.' });
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return res.status(400).json({ error: '만료된 상품권입니다.' });
  }
  const amount = card.balance;
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(amount, req.session.user.id);
  db.prepare('INSERT INTO point_transactions (user_id, amount, reason) VALUES (?, ?, ?)').run(
    req.session.user.id,
    amount,
    `상품권 등록 (${code})`
  );
  res.json({ ok: true, credited: amount });
});

// 관리자 — 상품권 발행/관리.
router.get('/manage', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM gift_cards ORDER BY id DESC').all();
  res.json({ giftCards: rows.map(toGiftCard) });
});

router.post('/', requireAdmin, (req, res) => {
  const { code, balance, active, expiresAt } = req.body;
  if (!code) return res.status(400).json({ error: '코드는 필수입니다.' });
  const amount = Number(balance) || 0;
  const result = db
    .prepare(
      'INSERT INTO gift_cards (code, balance, initial_balance, active, expires_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(String(code).trim(), amount, amount, active === false ? 0 : 1, expiresAt || null);
  const row = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ giftCard: toGiftCard(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '상품권을 찾을 수 없습니다.' });
  const { code, balance, active, expiresAt } = req.body;
  const newBalance = balance != null ? Number(balance) : existing.balance;
  db.prepare(
    'UPDATE gift_cards SET code = ?, balance = ?, active = ?, expires_at = ? WHERE id = ?'
  ).run(
    code != null ? String(code).trim() : existing.code,
    newBalance,
    active != null ? (active ? 1 : 0) : existing.active,
    expiresAt !== undefined ? expiresAt || null : existing.expires_at,
    existing.id
  );
  const row = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(existing.id);
  res.json({ giftCard: toGiftCard(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM gift_cards WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '상품권을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
