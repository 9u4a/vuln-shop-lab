const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toAddress(row) {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    postcode: row.postcode,
    address: row.address,
    addressDetail: row.address_detail,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
  };
}

// 내 배송지 목록.
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.session.user.id);
  res.json({ addresses: rows.map(toAddress) });
});

// 배송지 추가.
router.post('/', requireAuth, (req, res) => {
  const { label, name, phone, postcode, address, addressDetail, isDefault } = req.body;
  if (!name || !address) return res.status(400).json({ error: '수령인과 주소는 필수입니다.' });
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.session.user.id);
  }
  const result = db
    .prepare(
      `INSERT INTO addresses (user_id, label, name, phone, postcode, address, address_detail, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.session.user.id,
      label || null,
      name,
      phone || null,
      postcode || null,
      address,
      addressDetail || null,
      isDefault ? 1 : 0
    );
  const row = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ address: toAddress(row) });
});

// 배송지 수정.
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '배송지를 찾을 수 없습니다.' });
  const { label, name, phone, postcode, address, addressDetail, isDefault } = req.body;
  if (isDefault) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(existing.user_id);
  }
  db.prepare(
    `UPDATE addresses SET label = ?, name = ?, phone = ?, postcode = ?, address = ?, address_detail = ?, is_default = ?
     WHERE id = ?`
  ).run(
    label !== undefined ? label : existing.label,
    name ?? existing.name,
    phone !== undefined ? phone : existing.phone,
    postcode !== undefined ? postcode : existing.postcode,
    address ?? existing.address,
    addressDetail !== undefined ? addressDetail : existing.address_detail,
    isDefault != null ? (isDefault ? 1 : 0) : existing.is_default,
    existing.id
  );
  const row = db.prepare('SELECT * FROM addresses WHERE id = ?').get(existing.id);
  res.json({ address: toAddress(row) });
});

// 배송지 삭제.
router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM addresses WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '배송지를 찾을 수 없습니다.' });
  res.json({ ok: true });
});

module.exports = router;
