const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const REFERRAL_REWARD = 1000;

router.get('/', requireAuth, (req, res) => {
  const user = db.prepare('SELECT referral_code, referred_by FROM users WHERE id = ?').get(req.session.user.id);
  const referredCount = db.prepare('SELECT COUNT(*) AS c FROM users WHERE referred_by = ?').get(req.session.user.id).c;
  res.json({
    referralCode: user ? user.referral_code : null,
    referredBy: user ? user.referred_by : null,
    referredCount,
    reward: REFERRAL_REWARD,
  });
});

// 추천 코드 적용 — 멱등성·자기참조·유효성 검증 없이 매 호출마다 적립한다.
router.post('/apply', requireAuth, (req, res) => {
  const { code } = req.body;
  const me = req.session.user.id;
  const insertPtx = db.prepare('INSERT INTO point_transactions (user_id, amount, reason) VALUES (?, ?, ?)');

  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(REFERRAL_REWARD, me);
  insertPtx.run(me, REFERRAL_REWARD, '추천 코드 적용');

  const referrer = code ? db.prepare('SELECT id FROM users WHERE referral_code = ?').get(code) : null;
  if (referrer) {
    db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(REFERRAL_REWARD, referrer.id);
    insertPtx.run(referrer.id, REFERRAL_REWARD, '추천인 보상');
    db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.id, me);
  }

  res.json({ ok: true, reward: REFERRAL_REWARD });
});

module.exports = router;
