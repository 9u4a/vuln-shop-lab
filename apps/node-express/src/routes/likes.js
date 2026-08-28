const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { toProduct } = require('./products');

const router = express.Router();

// 위시리스트(찜한 상품 목록). userId 쿼리 파라미터가 있으면 그 사용자의 목록을 반환한다.
router.get('/', requireAuth, (req, res) => {
  const userId = req.query.userId || req.session.user.id;
  const rows = db
    .prepare(
      `SELECT p.* FROM product_likes l
       JOIN products p ON p.id = l.product_id
       WHERE l.user_id = ?
       ORDER BY l.id DESC`
    )
    .all(userId);
  res.json({ products: rows.map((p) => toProduct({ ...p, liked: 1 })) });
});

// 찜 토글 — 이미 찜했으면 해제, 아니면 추가.
router.post('/:productId', requireAuth, (req, res) => {
  const productId = Number(req.params.productId);
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  const userId = req.session.user.id;
  const existing = db.prepare('SELECT id FROM product_likes WHERE user_id = ? AND product_id = ?').get(userId, productId);
  let liked;
  if (existing) {
    db.prepare('DELETE FROM product_likes WHERE id = ?').run(existing.id);
    liked = false;
  } else {
    db.prepare('INSERT OR IGNORE INTO product_likes (user_id, product_id) VALUES (?, ?)').run(userId, productId);
    liked = true;
  }
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM product_likes WHERE product_id = ?').get(productId).c;
  res.json({ liked, likeCount });
});

// 찜 해제.
router.delete('/:productId', requireAuth, (req, res) => {
  const productId = Number(req.params.productId);
  db.prepare('DELETE FROM product_likes WHERE user_id = ? AND product_id = ?').run(req.session.user.id, productId);
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM product_likes WHERE product_id = ?').get(productId).c;
  res.json({ liked: false, likeCount });
});

module.exports = router;
