const express = require('express');
const db = require('../db');

const router = express.Router();

// 배송 조회 — 송장번호만으로 조회한다(비회원 배송조회).
router.get('/track', (req, res) => {
  const no = (req.query.no || '').trim();
  if (!no) return res.status(400).json({ error: '송장번호를 입력해주세요.' });
  const row = db
    .prepare(
      `SELECT s.carrier, s.tracking_no, s.status, s.order_id,
              o.ship_name, o.ship_phone, o.ship_postcode, o.ship_address, o.ship_address_detail
       FROM shipments s JOIN orders o ON o.id = s.order_id
       WHERE s.tracking_no = ?`
    )
    .get(no);
  if (!row) return res.status(404).json({ error: '배송 정보를 찾을 수 없습니다.' });
  const events = db
    .prepare(
      'SELECT status, description, location, occurred_at FROM tracking_events WHERE tracking_no = ? ORDER BY occurred_at, id'
    )
    .all(row.tracking_no)
    .map((e) => ({ status: e.status, description: e.description, location: e.location, occurredAt: e.occurred_at }));
  res.json({
    carrier: row.carrier,
    trackingNo: row.tracking_no,
    status: row.status,
    orderId: row.order_id,
    shipName: row.ship_name,
    shipPhone: row.ship_phone,
    shipPostcode: row.ship_postcode,
    shipAddress: row.ship_address,
    shipAddressDetail: row.ship_address_detail,
    events,
  });
});

module.exports = router;
