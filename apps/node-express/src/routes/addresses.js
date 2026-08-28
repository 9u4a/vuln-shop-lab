const express = require('express');
const ADDRESSES = require('../fixtures/addresses.json');

const router = express.Router();

// 주소 조회 — 우편번호 팝업이 검색어를 보내면 더미 주소록에서 매칭 결과를 반환한다.
router.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.json({ addresses: [], total: 0 });
  }
  const needle = q.toLowerCase();
  const matched = ADDRESSES.filter(
    (a) => a.address.toLowerCase().includes(needle) || a.zonecode.includes(needle)
  );
  res.json({ addresses: matched.slice(0, 30), total: matched.length });
});

module.exports = router;
