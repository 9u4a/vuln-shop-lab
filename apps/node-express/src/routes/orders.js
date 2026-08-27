const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

const receiptsDir = path.join(__dirname, '..', '..', 'receipts');
if (!fs.existsSync(receiptsDir)) fs.mkdirSync(receiptsDir, { recursive: true });

function toOrder(row) {
  return {
    id: row.id,
    status: row.status,
    totalAmount: row.total_amount,
    webhookUrl: row.webhook_url,
    tossOrderId: row.toss_order_id,
    createdAt: row.created_at,
  };
}

async function fireWebhook(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error(`Order webhook delivery failed: ${err.message}`);
  }
}

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.user.id);
  res.json({ orders: rows.map(toOrder) });
});

router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  const items = db
    .prepare(
      `SELECT oi.*, p.name AS product_name FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(order.id);
  res.json({
    order: toOrder(order),
    items: items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      optionValue: i.option_value,
    })),
  });
});

router.post('/', requireAuth, (req, res) => {
  const { items, webhookUrl } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '최소 1개 이상의 상품이 필요합니다.' });
  }

  let total = 0;
  const resolved = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: '유효하지 않은 주문 항목입니다.' });
    }
    total += product.price * quantity;
    resolved.push({ product, quantity, optionValue: item.optionValue || null });
  }

  const tossOrderId = `order_${crypto.randomUUID()}`;
  const insertOrder = db.prepare(
    `INSERT INTO orders (user_id, status, total_amount, webhook_url, toss_order_id)
     VALUES (?, 'pending', ?, ?, ?)`
  );
  const result = insertOrder.run(req.session.user.id, total, webhookUrl || null, tossOrderId);
  const orderId = result.lastInsertRowid;

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, option_value) VALUES (?, ?, ?, ?, ?)'
  );
  for (const { product, quantity, optionValue } of resolved) {
    insertItem.run(orderId, product.id, quantity, product.price, optionValue);
  }

  res.status(201).json({ orderId, tossOrderId, amount: total });
});

router.post('/:id/confirm', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  if (!TOSS_SECRET_KEY) {
    return res.status(501).json({ error: '이 서버에는 결제가 설정되어 있지 않습니다 (TOSS_SECRET_KEY 누락).' });
  }

  const { paymentKey, amount } = req.body;
  if (!paymentKey || Number(amount) !== order.total_amount) {
    return res.status(400).json({ error: '결제 검증에 실패했습니다: 금액이 일치하지 않습니다.' });
  }

  const authHeader = `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`;
  const tossRes = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentKey, orderId: order.toss_order_id, amount: order.total_amount }),
  });
  const tossData = await tossRes.json();

  if (!tossRes.ok) {
    db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(order.id);
    return res.status(502).json({ error: tossData.message || '결제 확인에 실패했습니다.' });
  }

  db.prepare("UPDATE orders SET status = 'paid', toss_payment_key = ? WHERE id = ?").run(paymentKey, order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  fireWebhook(order.webhook_url, {
    orderId: order.id,
    tossOrderId: order.toss_order_id,
    status: 'paid',
    amount: order.total_amount,
  });

  res.json({ ok: true, order: toOrder(updated) });
});

router.post('/:id/receipt', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const filename = `receipt_${order.id}.txt`;
  const filePath = path.join(receiptsDir, filename);
  const note = req.body.note || user.bio || '';

  const cmd = `echo "영수증 - 주문번호: ${order.toss_order_id} / 수령인: ${user.name} / 메모: ${note}" > "${filePath}"`;
  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: '영수증 생성에 실패했습니다.' });
    res.status(201).json({ filename });
  });
});

router.get('/receipt/:filename', requireAuth, (req, res) => {
  const filePath = path.join(receiptsDir, req.params.filename);
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return res.status(404).json({ error: '영수증을 찾을 수 없습니다.' });
    res.type('text/plain').send(content);
  });
});

module.exports = router;
