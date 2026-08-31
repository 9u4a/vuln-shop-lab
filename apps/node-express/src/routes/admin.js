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

// 관리자 사용자 프로필 수정 — 화이트리스트 필드만(역할/비밀번호/활성은 별도 엔드포인트)
router.put('/users/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  const { name, phone, postcode, address, addressDetail, bio } = req.body;
  db.prepare(
    `UPDATE users SET name = ?, phone = ?, postcode = ?, address = ?, address_detail = ?, bio = ? WHERE id = ?`
  ).run(
    name ?? existing.name,
    phone ?? existing.phone,
    postcode ?? existing.postcode,
    address ?? existing.address,
    addressDetail ?? existing.address_detail,
    bio ?? existing.bio,
    existing.id
  );
  res.json({ ok: true });
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
  const shipment = db.prepare('SELECT carrier, tracking_no, status FROM shipments WHERE order_id = ?').get(order.id);
  res.json({
    order: {
      id: order.id,
      username: order.username,
      status: order.status,
      totalAmount: order.total_amount,
      discountAmount: order.discount_amount || 0,
      tossOrderId: order.toss_order_id,
      createdAt: order.created_at,
      shipping: order.ship_name
        ? {
            name: order.ship_name,
            phone: order.ship_phone,
            postcode: order.ship_postcode,
            address: order.ship_address,
            addressDetail: order.ship_address_detail,
          }
        : null,
    },
    shipment: shipment
      ? { carrier: shipment.carrier, trackingNo: shipment.tracking_no, status: shipment.status }
      : null,
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      optionValue: i.option_value,
    })),
  });
});

// 주문 상태 변경
const ORDER_STATUSES = ['pending', 'paid', 'failed', 'cancelled'];
router.put('/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `상태는 ${ORDER_STATUSES.join(', ')} 중 하나여야 합니다.` });
  }
  const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  res.json({ ok: true, status });
});

// 송장 등록 — 택배사를 지정하면 순차 송장번호를 발번한다.
router.put('/orders/:id/shipment', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  const carrier = (req.body.carrier || '').trim() || 'CJ대한통운';
  const status = req.body.status || 'shipped';
  let shipment = db.prepare('SELECT id FROM shipments WHERE order_id = ?').get(order.id);
  if (!shipment) {
    const r = db.prepare('INSERT INTO shipments (order_id, carrier, status) VALUES (?, ?, ?)').run(order.id, carrier, status);
    db.prepare('UPDATE shipments SET tracking_no = ? WHERE id = ?').run(String(1000000000 + r.lastInsertRowid), r.lastInsertRowid);
    shipment = { id: r.lastInsertRowid };
  } else {
    db.prepare('UPDATE shipments SET carrier = ?, status = ? WHERE id = ?').run(carrier, status, shipment.id);
  }
  const row = db.prepare('SELECT carrier, tracking_no, status FROM shipments WHERE id = ?').get(shipment.id);
  res.json({ carrier: row.carrier, trackingNo: row.tracking_no, status: row.status });
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

// 공용 이미지 업로드 — 공지/이벤트 등에서 파일을 올린 뒤 반환된 filename을 imageUrl로 사용.
router.post('/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 없거나 형식이 올바르지 않습니다.' });
  }
  res.status(201).json({ filename: req.file.filename });
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

// 추천인 내역 조회 — 사용자별 추천 코드/피추천인/추천 수/포인트.
router.get('/referrals', requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.referral_code, u.points,
              r.username AS referred_by_username,
              (SELECT COUNT(*) FROM users c WHERE c.referred_by = u.id) AS referred_count
       FROM users u
       LEFT JOIN users r ON r.id = u.referred_by
       ORDER BY referred_count DESC, u.id`
    )
    .all();
  res.json({
    referrals: rows.map((u) => ({
      id: u.id,
      username: u.username,
      referralCode: u.referral_code,
      referredByUsername: u.referred_by_username,
      referredCount: u.referred_count,
      points: u.points,
    })),
  });
});

// 스토어 설정 조회/저장 — 알림 연동 웹훅 URL 등 관리자 설정을 영속화한다.
const WEBHOOK_KEY = 'notification_webhook_url';
function getSetting(key) {
  return db.prepare('SELECT value FROM store_settings WHERE setting_key = ?').get(key)?.value || null;
}
function setSetting(key, value) {
  db.prepare(
    'INSERT INTO store_settings (setting_key, value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

router.get('/settings', requireAdmin, (req, res) => {
  res.json({ notificationWebhookUrl: getSetting(WEBHOOK_KEY) });
});

router.put('/settings', requireAdmin, (req, res) => {
  setSetting(WEBHOOK_KEY, req.body.notificationWebhookUrl || null);
  res.json({ ok: true, notificationWebhookUrl: getSetting(WEBHOOK_KEY) });
});

// 알림 연동(웹훅) 테스트 — 입력 URL(없으면 저장된 URL)로 서버가 요청하고 응답을 그대로 반환한다.
router.post('/integrations/webhook/test', requireAdmin, async (req, res) => {
  const url = req.body.url || getSetting(WEBHOOK_KEY);
  if (!url) return res.status(400).json({ error: 'URL이 필요합니다.' });
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await upstream.text();
    res.json({ ok: true, status: upstream.status, body: body.slice(0, 5000) });
  } catch (err) {
    res.status(502).json({ error: `웹훅 요청 실패: ${err.message}` });
  }
});

module.exports = router;
