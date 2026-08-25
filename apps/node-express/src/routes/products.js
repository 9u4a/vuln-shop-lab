const express = require('express');
const db = require('../db');

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

module.exports = router;
