const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

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
    return res.status(404).json({ error: 'Order not found' });
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
    })),
  });
});

router.post('/', requireAuth, (req, res) => {
  const { items, webhookUrl } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required.' });
  }

  let total = 0;
  const resolved = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: 'Invalid order item.' });
    }
    total += product.price * quantity;
    resolved.push({ product, quantity });
  }

  const tossOrderId = `order_${crypto.randomUUID()}`;
  const insertOrder = db.prepare(
    `INSERT INTO orders (user_id, status, total_amount, webhook_url, toss_order_id)
     VALUES (?, 'pending', ?, ?, ?)`
  );
  const result = insertOrder.run(req.session.user.id, total, webhookUrl || null, tossOrderId);
  const orderId = result.lastInsertRowid;

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
  );
  for (const { product, quantity } of resolved) {
    insertItem.run(orderId, product.id, quantity, product.price);
  }

  res.status(201).json({ orderId, tossOrderId, amount: total });
});

router.post('/:id/confirm', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (!TOSS_SECRET_KEY) {
    return res.status(501).json({ error: 'Payment is not configured on this server (TOSS_SECRET_KEY missing).' });
  }

  const { paymentKey, amount } = req.body;
  if (!paymentKey || Number(amount) !== order.total_amount) {
    return res.status(400).json({ error: 'Payment verification failed: amount mismatch.' });
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
    return res.status(502).json({ error: tossData.message || 'Payment confirmation failed.' });
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

module.exports = router;
