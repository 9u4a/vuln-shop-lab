const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function toCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderAmount: row.min_order_amount,
    active: !!row.active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

// 발급 가능한(활성) 쿠폰 목록 — 로그인 사용자는 이미 받았는지 여부(claimed)도 포함.
router.get('/', (req, res) => {
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `SELECT * FROM coupons
       WHERE active = 1 AND (expires_at IS NULL OR expires_at >= ?)
       ORDER BY id DESC`
    )
    .all(now);
  let claimedSet = new Set();
  if (req.session.user) {
    claimedSet = new Set(
      db.prepare('SELECT coupon_id FROM user_coupons WHERE user_id = ?').all(req.session.user.id).map((r) => r.coupon_id)
    );
  }
  res.json({ coupons: rows.map((r) => ({ ...toCoupon(r), claimed: claimedSet.has(r.id) })) });
});

// 체크아웃 쿠폰 미리보기 — 코드로 유효성·할인액만 계산(사용 처리는 주문 생성 시).
router.post('/apply-preview', requireAuth, (req, res) => {
  const code = (req.body.code || '').trim();
  const itemsTotal = Number(req.body.itemsTotal) || 0;
  if (!code) return res.json({ valid: false, discountAmount: 0, reason: '쿠폰 코드를 입력해주세요.' });

  const row = db
    .prepare(
      `SELECT c.* FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.user_id = ? AND c.code = ? ORDER BY uc.id DESC`
    )
    .get(req.session.user.id, code);
  if (!row) return res.json({ valid: false, discountAmount: 0, reason: '보유하지 않은 쿠폰입니다.' });
  if (!row.active) return res.json({ valid: false, discountAmount: 0, reason: '사용할 수 없는 쿠폰입니다.' });
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return res.json({ valid: false, discountAmount: 0, reason: '만료된 쿠폰입니다.' });
  }
  if (itemsTotal < (row.min_order_amount || 0)) {
    return res.json({ valid: false, discountAmount: 0, reason: `최소 주문금액 ${row.min_order_amount}원 이상부터 사용 가능합니다.` });
  }
  const discount =
    row.discount_type === 'percent'
      ? Math.floor((itemsTotal * row.discount_value) / 100)
      : row.discount_value;
  res.json({ valid: true, discountAmount: Math.min(discount, itemsTotal), reason: null });
});

// 내 쿠폰함.
router.get('/mine', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, uc.id AS user_coupon_id, uc.used, uc.claimed_at
       FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.user_id = ?
       ORDER BY uc.id DESC`
    )
    .all(req.session.user.id);
  res.json({
    coupons: rows.map((r) => ({
      ...toCoupon(r),
      userCouponId: r.user_coupon_id,
      used: !!r.used,
      claimedAt: r.claimed_at,
    })),
  });
});

// 쿠폰 받기(발급).
router.post('/:id/claim', requireAuth, (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ? AND active = 1').get(req.params.id);
  if (!coupon) return res.status(404).json({ error: '쿠폰을 찾을 수 없습니다.' });
  const result = db
    .prepare('INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)')
    .run(req.session.user.id, coupon.id);
  res.status(201).json({ userCouponId: result.lastInsertRowid, coupon: toCoupon(coupon) });
});

// 관리자 — 전체 쿠폰 관리/생성/수정/삭제.
router.get('/manage', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  res.json({ coupons: rows.map(toCoupon) });
});

router.post('/', requireAdmin, (req, res) => {
  const { code, title, description, discountType, discountValue, minOrderAmount, active, expiresAt } = req.body;
  if (!code || !title) return res.status(400).json({ error: '코드와 제목은 필수입니다.' });
  const result = db
    .prepare(
      `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order_amount, active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(code).trim(),
      String(title).trim(),
      description || null,
      discountType === 'percent' ? 'percent' : 'amount',
      Number(discountValue) || 0,
      Number(minOrderAmount) || 0,
      active === false ? 0 : 1,
      expiresAt || null
    );
  const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ coupon: toCoupon(row) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '쿠폰을 찾을 수 없습니다.' });
  const { code, title, description, discountType, discountValue, minOrderAmount, active, expiresAt } = req.body;
  db.prepare(
    `UPDATE coupons SET code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?,
      min_order_amount = ?, active = ?, expires_at = ? WHERE id = ?`
  ).run(
    code != null ? String(code).trim() : existing.code,
    title != null ? String(title).trim() : existing.title,
    description !== undefined ? description || null : existing.description,
    discountType != null ? (discountType === 'percent' ? 'percent' : 'amount') : existing.discount_type,
    discountValue != null ? Number(discountValue) : existing.discount_value,
    minOrderAmount != null ? Number(minOrderAmount) : existing.min_order_amount,
    active != null ? (active ? 1 : 0) : existing.active,
    expiresAt !== undefined ? expiresAt || null : existing.expires_at,
    existing.id
  );
  const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(existing.id);
  res.json({ coupon: toCoupon(row) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '쿠폰을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
