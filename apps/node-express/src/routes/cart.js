const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function cartIdFor(userId) {
  const existing = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(userId);
  if (existing) return existing.id;
  return db.prepare('INSERT INTO carts (user_id) VALUES (?)').run(userId).lastInsertRowid;
}

function cartLines(cartId) {
  return db
    .prepare(
      `SELECT ci.id, ci.product_id, ci.quantity, ci.option_value,
              p.name, p.price, p.stock, p.option_name, p.option_values
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ?
       ORDER BY ci.id`
    )
    .all(cartId)
    .map((r) => ({
      id: r.id,
      productId: r.product_id,
      name: r.name,
      price: r.price,
      quantity: r.quantity,
      optionValue: r.option_value,
      stock: r.stock,
      optionName: r.option_name,
      optionValues: r.option_values ? r.option_values.split(',') : [],
    }));
}

router.get('/', requireAuth, (req, res) => {
  const cartId = cartIdFor(req.session.user.id);
  res.json({ items: cartLines(cartId) });
});

router.post('/items', requireAuth, (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Math.max(1, Number(req.body.quantity) || 1);
  const optionValue = req.body.optionValue || null;
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });

  const cartId = cartIdFor(req.session.user.id);
  const existing = db
    .prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND IFNULL(option_value, '') = IFNULL(?, '')")
    .get(cartId, productId, optionValue);
  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(existing.quantity + quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (cart_id, product_id, quantity, option_value) VALUES (?, ?, ?, ?)')
      .run(cartId, productId, quantity, optionValue);
  }
  res.status(201).json({ items: cartLines(cartId) });
});

router.put('/items/:id', requireAuth, (req, res) => {
  const cartId = cartIdFor(req.session.user.id);
  const line = db.prepare('SELECT id FROM cart_items WHERE id = ? AND cart_id = ?').get(req.params.id, cartId);
  if (!line) return res.status(404).json({ error: '장바구니 항목을 찾을 수 없습니다.' });
  const quantity = Number(req.body.quantity);
  if (quantity <= 0 || !Number.isFinite(quantity)) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(line.id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(Math.floor(quantity), line.id);
  }
  res.json({ items: cartLines(cartId) });
});

router.delete('/items/:id', requireAuth, (req, res) => {
  const cartId = cartIdFor(req.session.user.id);
  db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(req.params.id, cartId);
  res.json({ items: cartLines(cartId) });
});

router.delete('/', requireAuth, (req, res) => {
  const cartId = cartIdFor(req.session.user.id);
  db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
  res.json({ items: [] });
});

module.exports = router;
