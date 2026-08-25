const express = require('express');
const db = require('../db');
const { requireAdmin, requireSystemAdmin } = require('../middleware/auth');
const { upload } = require('../uploads');

const router = express.Router();

router.get('/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, role, bio, avatar_url, created_at FROM users ORDER BY id').all();
  res.json({ users: rows });
});

router.put('/users/:id/role', requireSystemAdmin, (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin', 'system_admin'].includes(role)) {
    return res.status(400).json({ error: '권한은 "user", "admin", "system_admin" 중 하나여야 합니다.' });
  }
  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  res.json({ ok: true });
});

router.get('/orders', requireAdmin, (req, res) => {
  const rows = db
    .prepare('SELECT o.*, u.username FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC')
    .all();
  res.json({
    orders: rows.map((o) => ({
      id: o.id,
      username: o.username,
      status: o.status,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
    })),
  });
});

router.post('/products', requireAdmin, (req, res) => {
  const { name, description, price, imageUrl, category, brand, sku, stock, optionName, optionValues } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ error: '이름과 가격은 필수입니다.' });
  }
  const result = db
    .prepare(
      `INSERT INTO products
        (name, description, price, image_url, category, brand, sku, stock, option_name, option_values)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      description || null,
      Number(price),
      imageUrl || null,
      category || null,
      brand || null,
      sku || null,
      stock != null ? Number(stock) : 100,
      optionName || null,
      Array.isArray(optionValues) ? optionValues.join(',') : optionValues || null
    );
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/products/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  const { name, description, price, imageUrl, category, brand, sku, stock, optionName, optionValues } = req.body;
  db.prepare(
    `UPDATE products SET
      name = ?, description = ?, price = ?, image_url = ?, category = ?,
      brand = ?, sku = ?, stock = ?, option_name = ?, option_values = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    price != null ? Number(price) : existing.price,
    imageUrl ?? existing.image_url,
    category ?? existing.category,
    brand ?? existing.brand,
    sku ?? existing.sku,
    stock != null ? Number(stock) : existing.stock,
    optionName ?? existing.option_name,
    (Array.isArray(optionValues) ? optionValues.join(',') : optionValues) ?? existing.option_values,
    existing.id
  );
  res.json({ ok: true });
});

router.post('/products/:id/image', requireAdmin, upload.single('image'), (req, res) => {
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 없거나 형식이 올바르지 않습니다.' });
  }
  db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(req.file.filename, existing.id);
  res.json({ imageUrl: req.file.filename });
});

router.delete('/products/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
