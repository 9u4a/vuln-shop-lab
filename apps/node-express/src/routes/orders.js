const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { insertActivity } = require('../mongo');
const { tierRate } = require('../tiers');
const { notify } = require('../notify');
const { orderShareToken: shareToken } = require('../share-token');

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
    discountAmount: row.discount_amount || 0,
    webhookUrl: row.webhook_url,
    tossOrderId: row.toss_order_id,
    shareToken: row.share_token,
    shipping: row.ship_name
      ? {
          name: row.ship_name,
          phone: row.ship_phone,
          postcode: row.ship_postcode,
          address: row.ship_address,
          addressDetail: row.ship_address_detail,
        }
      : null,
    createdAt: row.created_at,
  };
}

function shipmentEvents(trackingNo) {
  if (!trackingNo) return [];
  return db
    .prepare(
      'SELECT status, description, location, occurred_at FROM tracking_events WHERE tracking_no = ? ORDER BY occurred_at, id'
    )
    .all(trackingNo)
    .map((e) => ({
      status: e.status,
      description: e.description,
      location: e.location,
      occurredAt: e.occurred_at,
    }));
}

function toShipment(row) {
  if (!row) return null;
  return {
    carrier: row.carrier,
    trackingNo: row.tracking_no,
    status: row.status,
    events: shipmentEvents(row.tracking_no),
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

function orderItems(orderId) {
  return db
    .prepare(
      `SELECT oi.*, p.name AS product_name FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(orderId)
    .map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      optionValue: i.option_value,
    }));
}

// 주문 공유 링크 — 로그인 없이 토큰만으로 열람(읽기 전용).
router.get('/shared/:token', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE share_token = ?').get(req.params.token);
  if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  const shipment = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(order.id);
  res.json({
    order: {
      id: order.id,
      status: order.status,
      totalAmount: order.total_amount,
      discountAmount: order.discount_amount || 0,
      createdAt: order.created_at,
      shipping: toOrder(order).shipping,
    },
    items: orderItems(order.id),
    shipment: toShipment(shipment),
  });
});

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.user.id);
  const orders = rows.map((row) => {
    const items = db
      .prepare(
        `SELECT p.name FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`
      )
      .all(row.id);
    const shipment = db.prepare('SELECT status FROM shipments WHERE order_id = ?').get(row.id);
    return {
      ...toOrder(row),
      itemSummary: items[0] ? items[0].name : null,
      itemCount: items.length,
      shipmentStatus: shipment ? shipment.status : null,
    };
  });
  res.json({ orders });
});

router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  const shipment = db.prepare('SELECT * FROM shipments WHERE order_id = ?').get(order.id);
  res.json({
    order: toOrder(order),
    items: orderItems(order.id),
    shipment: toShipment(shipment),
  });
});

// 사용자의 보유 쿠폰(+coupons 조인)을 코드로 조회.
function findUserCoupon(userId, code) {
  return db
    .prepare(
      `SELECT uc.id AS user_coupon_id, uc.used, c.*
       FROM user_coupons uc JOIN coupons c ON c.id = uc.coupon_id
       WHERE uc.user_id = ? AND c.code = ?
       ORDER BY uc.id DESC`
    )
    .get(userId, code);
}

// 쿠폰 유효성 검증 + 할인액 계산(서버). used 여부는 여기서 보지 않는다.
function computeCouponDiscount(coupon, itemsTotal) {
  if (!coupon) return { ok: false, reason: '보유하지 않은 쿠폰입니다.' };
  if (!coupon.active) return { ok: false, reason: '사용할 수 없는 쿠폰입니다.' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { ok: false, reason: '만료된 쿠폰입니다.' };
  }
  if (itemsTotal < (coupon.min_order_amount || 0)) {
    return { ok: false, reason: `최소 주문금액 ${coupon.min_order_amount}원 이상부터 사용 가능합니다.` };
  }
  const discount =
    coupon.discount_type === 'percent'
      ? Math.floor((itemsTotal * coupon.discount_value) / 100)
      : coupon.discount_value;
  return { ok: true, discount: Math.min(discount, itemsTotal), couponId: coupon.id, userCouponId: coupon.user_coupon_id };
}

router.post('/', requireAuth, async (req, res) => {
  const { items, webhookUrl, pointsUsed, couponCode, shipping } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '최소 1개 이상의 상품이 필요합니다.' });
  }

  let itemsTotal = 0;
  const resolved = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    const quantity = Number(item.quantity);
    if (!product || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: '유효하지 않은 주문 항목입니다.' });
    }
    itemsTotal += product.price * quantity;
    resolved.push({ product, quantity, optionValue: item.optionValue || null });
  }

  // 재고 차감 — 항목별로 현재 재고를 읽고, 활동 로그를 남긴 뒤 감산한다.
  for (const { product, quantity } of resolved) {
    const current = db.prepare('SELECT stock FROM products WHERE id = ?').get(product.id).stock;
    await insertActivity(req.session.user.id, 'order.create', `${product.name} x${quantity}`);
    db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(current - quantity, product.id);
  }

  // 쿠폰 적용
  let discount = 0;
  let couponId = null;
  if (couponCode) {
    const applied = computeCouponDiscount(findUserCoupon(req.session.user.id, couponCode), itemsTotal);
    if (!applied.ok) {
      return res.status(400).json({ error: applied.reason });
    }
    discount = applied.discount;
    couponId = applied.couponId;
  }

  // 회원 등급 할인 — 등급별 정률
  const buyer = db.prepare('SELECT membership_tier FROM users WHERE id = ?').get(req.session.user.id);
  const tierDiscount = Math.floor(itemsTotal * tierRate(buyer.membership_tier));
  discount += tierDiscount;

  const usePoints = Number(pointsUsed) || 0;
  const total = itemsTotal - discount - usePoints;

  // 배송지 스냅샷 — 요청 override가 있으면 그것을, 없으면 프로필 주소를 복사.
  const profile = db.prepare('SELECT name, phone, postcode, address, address_detail FROM users WHERE id = ?').get(req.session.user.id);
  const ship = {
    name: shipping?.name || profile.name,
    phone: shipping?.phone || profile.phone,
    postcode: shipping?.postcode || profile.postcode,
    address: shipping?.address || profile.address,
    addressDetail: shipping?.addressDetail ?? profile.address_detail,
  };

  const tossOrderId = `order_${crypto.randomUUID()}`;
  const insertOrder = db.prepare(
    `INSERT INTO orders
       (user_id, status, total_amount, discount_amount, coupon_id, points_used, webhook_url, toss_order_id,
        ship_name, ship_phone, ship_postcode, ship_address, ship_address_detail)
     VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = insertOrder.run(
    req.session.user.id, total, discount, couponId, usePoints, webhookUrl || null, tossOrderId,
    ship.name, ship.phone, ship.postcode, ship.address, ship.addressDetail
  );
  const orderId = result.lastInsertRowid;
  db.prepare('UPDATE orders SET share_token = ? WHERE id = ?').run(shareToken(orderId), orderId);

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price, option_value) VALUES (?, ?, ?, ?, ?)'
  );
  for (const { product, quantity, optionValue } of resolved) {
    insertItem.run(orderId, product.id, quantity, product.price, optionValue);
  }

  // 포인트 사용/적립과 쿠폰 사용 마킹은 결제 확인(POST /:id/confirm) 시점에 처리한다.
  const earned = Math.floor(itemsTotal * 0.05);

  // 장바구니 비우기는 결제 확인(POST /:id/confirm) 성공 시점으로 미룬다 — 결제 미완료로 빠져나오면 유지.

  notify(req.session.user.id, 'order', '주문이 접수되었습니다', `주문 #${orderId}이(가) 접수되었습니다.`, `/orders/${orderId}`);

  // 주문 접수 알림 웹훅 — 등록된 URL로 즉시 발송(비동기, 실패 무시). URL 검증 없음(VULN-004).
  fireWebhook(webhookUrl, {
    event: 'order.created',
    orderId,
    tossOrderId,
    status: 'pending',
    amount: total,
  });

  res.status(201).json({
    orderId,
    tossOrderId,
    amount: total,
    discountAmount: discount,
    pointsUsed: usePoints,
    pointsEarned: earned,
    shareToken: shareToken(orderId),
  });
});

router.post('/:id/confirm', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  if (order.status === 'paid') {
    return res.json({ ok: true, order: toOrder(order) });
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

  // 결제가 확정된 시점에만 포인트를 차감/적립하고 쿠폰을 사용 처리한다.
  const usePoints = order.points_used || 0;
  const itemsTotal = order.total_amount + (order.discount_amount || 0) + usePoints;
  const insertPtx = db.prepare(
    'INSERT INTO point_transactions (user_id, amount, reason, order_id) VALUES (?, ?, ?, ?)'
  );
  if (usePoints !== 0) {
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(usePoints, order.user_id);
    insertPtx.run(order.user_id, -usePoints, '주문 사용', order.id);
  }
  const earned = Math.floor(itemsTotal * 0.05);
  if (earned > 0) {
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(earned, order.user_id);
    insertPtx.run(order.user_id, earned, '주문 적립', order.id);
  }
  // 쿠폰 사용 처리 — 이미 사용된 쿠폰인지 확인하지 않는다.
  if (order.coupon_id) {
    const uc = db
      .prepare('SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ? ORDER BY id DESC')
      .get(order.user_id, order.coupon_id);
    if (uc) db.prepare('UPDATE user_coupons SET used = 1 WHERE id = ?').run(uc.id);
  }
  // 결제 확정 시점에 서버 장바구니 비우기
  const paidCart = db.prepare('SELECT id FROM carts WHERE user_id = ?').get(order.user_id);
  if (paidCart) db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(paidCart.id);

  notify(order.user_id, 'order', '결제가 완료되었습니다', `주문 #${order.id} 결제가 완료되었습니다.`, `/orders/${order.id}`);

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
  const items = orderItems(order.id);

  const lines = [
    '======== VULN SHOP 영수증 ========',
    `주문번호: ${order.toss_order_id}`,
    `주문일자: ${order.created_at}`,
    `수령인: ${user.name}`,
    `배송지: (${order.ship_postcode || ''}) ${order.ship_address || ''} ${order.ship_address_detail || ''}`,
    '----------------------------------',
    ...items.map((i) => `${i.productName} (${i.optionValue || '-'}) x${i.quantity}    ${i.unitPrice * i.quantity}원`),
    '----------------------------------',
    `할인금액: ${order.discount_amount || 0}원`,
    `결제금액: ${order.total_amount}원`,
    `메모: ${note}`,
    '==================================',
  ].join('\n');

  const cmd = `echo "${lines}" > "${filePath}"`;
  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: '영수증 생성에 실패했습니다.' });
    res.status(201).json({ filename });
  });
});

router.get('/:id/receipt/print', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.user_id !== req.session.user.id) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const note = req.query.note || '';
  const items = orderItems(order.id);
  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.productName}</td><td>${i.optionValue || '-'}</td><td style="text-align:right">${i.quantity}</td><td style="text-align:right">${(i.unitPrice * i.quantity).toLocaleString()}원</td></tr>`
    )
    .join('');
  res.type('html').send(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>영수증</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 520px; margin: 32px auto; color: #1a1a1a; }
  h1 { font-size: 20px; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; }
  .meta { color: #555; font-size: 13px; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #eee; text-align: left; }
  .total { text-align: right; font-size: 16px; font-weight: 700; margin-top: 8px; }
</style></head>
<body>
<h1>VULN SHOP 영수증</h1>
<div class="meta">
  <div>주문번호: ${order.toss_order_id}</div>
  <div>주문일자: ${order.created_at}</div>
  <div>수령인: ${user.name}</div>
  <div>배송지: (${order.ship_postcode || ''}) ${order.ship_address || ''} ${order.ship_address_detail || ''}</div>
</div>
<table>
  <thead><tr><th>상품</th><th>옵션</th><th style="text-align:right">수량</th><th style="text-align:right">금액</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="meta">할인금액: ${(order.discount_amount || 0).toLocaleString()}원</div>
<div class="total">결제금액: ${order.total_amount.toLocaleString()}원</div>
<p class="meta">메모: ${note}</p>
</body></html>`
  );
});

router.get('/receipt/:filename', requireAuth, (req, res) => {
  const filePath = path.join(receiptsDir, req.params.filename);
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return res.status(404).json({ error: '영수증을 찾을 수 없습니다.' });
    res.type('text/plain').send(content);
  });
});

module.exports = router;
