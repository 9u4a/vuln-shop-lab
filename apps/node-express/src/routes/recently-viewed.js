const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { toProduct } = require('./products');

const router = express.Router();

// 최근 본 상품 — 최근 조회 순.
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM recently_viewed rv
       JOIN products p ON p.id = rv.product_id
       WHERE rv.user_id = ?
       ORDER BY rv.id DESC
       LIMIT 20`
    )
    .all(req.session.user.id);
  res.json({ products: rows.map((p) => toProduct(p)) });
});

module.exports = router;
