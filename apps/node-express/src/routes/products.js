const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  let products;
  if (q) {
    products = db.prepare('SELECT * FROM products WHERE name LIKE ? ORDER BY id').all(`%${q}%`);
  } else {
    products = db.prepare('SELECT * FROM products ORDER BY id').all();
  }
  res.json({ products });
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
});

router.get('/:id/reviews', (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, u.username FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? ORDER BY r.id DESC`
    )
    .all(req.params.id);
  res.json({
    reviews: rows.map((r) => ({
      id: r.id,
      username: r.username,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
    })),
  });
});

router.post('/:id/reviews', requireAuth, (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const rating = Number(req.body.rating);
  const body = (req.body.body || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !body) {
    return res.status(400).json({ error: 'Rating (1-5) and non-empty body are required.' });
  }

  const result = db
    .prepare('INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)')
    .run(product.id, req.session.user.id, rating, body);

  res.status(201).json({
    review: {
      id: result.lastInsertRowid,
      username: req.session.user.username,
      rating,
      body,
    },
  });
});

module.exports = router;
