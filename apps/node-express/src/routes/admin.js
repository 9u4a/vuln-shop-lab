const express = require('express');
const db = require('../db');
const { requireAdmin, requireSystemAdmin } = require('../middleware/auth');
const { upload } = require('../uploads');

const router = express.Router();

router.get('/stats', requireAdmin, (req, res) => {
  const count = (table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  res.json({
    users: count('users'),
    orders: count('orders'),
    products: count('products'),
    faqs: count('faqs'),
    notices: count('notices'),
  });
});

router.get('/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, role, bio, avatar_url, active, created_at FROM users ORDER BY id').all();
  res.json({ users: rows.map((u) => ({ ...u, active: u.active !== 0 })) });
});

router.put('/users/:id/active', requireAdmin, (req, res) => {
  const { active } = req.body;
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, target.id);
  res.json({ ok: true, active: !!active });
});

router.get('/login-logs', requireAdmin, (req, res) => {
  const { username, success } = req.query;
  let sql = 'SELECT * FROM login_logs WHERE 1=1';
  const params = [];
  if (username) {
    sql += ' AND username = ?';
    params.push(username);
  }
  if (success === '0' || success === '1') {
    sql += ' AND success = ?';
    params.push(Number(success));
  }
  sql += ' ORDER BY id DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({
    logs: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      ip: r.ip,
      userAgent: r.user_agent,
      success: !!r.success,
      at: r.at,
    })),
  });
});

router.get('/users/:id', requireAdmin, (req, res) => {
  const u = db
    .prepare(
      `SELECT id, username, role, bio, avatar_url, name, phone, postcode, address, address_detail, active, created_at
       FROM users WHERE id = ?`
    )
    .get(req.params.id);
  if (!u) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  const orders = db
    .prepare('SELECT id, status, total_amount, created_at FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(u.id);
  res.json({
    user: {
      id: u.id,
      username: u.username,
      role: u.role,
      bio: u.bio,
      avatarUrl: u.avatar_url,
      name: u.name,
      phone: u.phone,
      postcode: u.postcode,
      address: u.address,
      addressDetail: u.address_detail,
      active: u.active !== 0,
      createdAt: u.created_at,
    },
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.total_amount,
      createdAt: o.created_at,
    })),
  });
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

router.get('/orders/:id', requireAdmin, (req, res) => {
  const order = db
    .prepare('SELECT o.*, u.username FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?')
    .get(req.params.id);
  if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  const items = db
    .prepare(
      `SELECT oi.*, p.name AS product_name FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(order.id);
  res.json({
    order: {
      id: order.id,
      username: order.username,
      status: order.status,
      totalAmount: order.total_amount,
      tossOrderId: order.toss_order_id,
      createdAt: order.created_at,
    },
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      optionValue: i.option_value,
    })),
  });
});

router.post('/products', requireAdmin, (req, res) => {
  const { name, description, price, imageUrl, category, brand, sku, gender, color, material, stock, optionName, optionValues } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ error: '이름과 가격은 필수입니다.' });
  }
  const result = db
    .prepare(
      `INSERT INTO products
        (name, description, price, image_url, category, brand, sku, gender, color, material, stock, option_name, option_values)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      description || null,
      Number(price),
      imageUrl || null,
      category || null,
      brand || null,
      sku || null,
      gender || null,
      color || null,
      material || null,
      stock != null ? Number(stock) : 100,
      optionName || null,
      Array.isArray(optionValues) ? optionValues.join(',') : optionValues || null
    );
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/products/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
  const { name, description, price, imageUrl, category, brand, sku, gender, color, material, stock, optionName, optionValues } = req.body;
  db.prepare(
    `UPDATE products SET
      name = ?, description = ?, price = ?, image_url = ?, category = ?,
      brand = ?, sku = ?, gender = ?, color = ?, material = ?, stock = ?, option_name = ?, option_values = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    price != null ? Number(price) : existing.price,
    imageUrl ?? existing.image_url,
    category ?? existing.category,
    brand ?? existing.brand,
    sku ?? existing.sku,
    gender ?? existing.gender,
    color ?? existing.color,
    material ?? existing.material,
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
