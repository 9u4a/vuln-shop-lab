const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { notify } = require('../notify');
const { giftCode } = require('../gift-code');

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

function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    active: !!row.active,
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

// 구매 가능한 상품권 액면가 목록.
router.get('/products', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM gift_card_products WHERE active = 1 ORDER BY amount').all();
  res.json({ products: rows.map(toProduct) });
});

// 상품권 구매 — 액면가를 골라 구매하면 코드를 발급해 본인 소유로 등록한다.
router.post('/purchase', requireAuth, (req, res) => {
  const product = db
    .prepare('SELECT * FROM gift_card_products WHERE id = ? AND active = 1')
    .get(req.body.productId);
  if (!product) return res.status(404).json({ error: '상품권을 찾을 수 없습니다.' });

  const tmpCode = `pending-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const result = db
    .prepare(
      'INSERT INTO gift_cards (code, balance, initial_balance, active, owner_id, product_id) VALUES (?, ?, ?, 1, ?, ?)'
    )
    .run(tmpCode, product.amount, product.amount, req.session.user.id, product.id);
  const id = result.lastInsertRowid;
  const code = giftCode(id, product.amount);
  db.prepare('UPDATE gift_cards SET code = ? WHERE id = ?').run(code, id);

  notify(req.session.user.id, 'giftcard', '상품권이 발급되었습니다', `${product.name} 상품권을 구매했습니다.`, '/mypage/rewards');
  const row = db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id);
  res.status(201).json({ giftCard: toGiftCard(row) });
});

// 내 상품권 — 구매(발급)한 상품권 목록.
router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM gift_cards WHERE owner_id = ? ORDER BY id DESC')
    .all(req.session.user.id);
  res.json({ giftCards: rows.map(toGiftCard) });
});

// 관리자 — 상품권 액면가 관리.
router.get('/products/manage', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM gift_card_products ORDER BY id DESC').all();
  res.json({ products: rows.map(toProduct) });
});

router.post('/products', requireAdmin, (req, res) => {
  const { name, amount, active } = req.body;
  if (!name || amount == null) return res.status(400).json({ error: '이름과 금액은 필수입니다.' });
  const result = db
    .prepare('INSERT INTO gift_card_products (name, amount, active) VALUES (?, ?, ?)')
    .run(String(name).trim(), Number(amount) || 0, active === false ? 0 : 1);
  const row = db.prepare('SELECT * FROM gift_card_products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ product: toProduct(row) });
});

router.put('/products/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM gift_card_products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '상품권을 찾을 수 없습니다.' });
  const { name, amount, active } = req.body;
  db.prepare('UPDATE gift_card_products SET name = ?, amount = ?, active = ? WHERE id = ?').run(
    name != null ? String(name).trim() : existing.name,
    amount != null ? Number(amount) : existing.amount,
    active != null ? (active ? 1 : 0) : existing.active,
    existing.id
  );
  const row = db.prepare('SELECT * FROM gift_card_products WHERE id = ?').get(existing.id);
  res.json({ product: toProduct(row) });
});

router.delete('/products/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM gift_card_products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '상품권을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

// 관리자 — 발행된 상품권 카드 관리(기존).
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
