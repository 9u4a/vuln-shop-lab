const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, name, phone, postcode, address, addressDetail, referralCode } = req.body;
  if (!username || !password || !name || !phone || !postcode || !address) {
    return res.status(400).json({ error: '아이디, 비밀번호, 이름, 전화번호, 주소는 필수입니다.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  const role = userCount === 0 ? 'system_admin' : 'user';
  const referralCodeForUser = `REF${username.toUpperCase()}`;
  const result = db.prepare(
    `INSERT INTO users (username, password_hash, role, name, phone, postcode, address, address_detail, referral_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(username, passwordHash, role, name, phone, postcode, address, addressDetail || null, referralCodeForUser);
  const newUserId = result.lastInsertRowid;

  if (referralCode) {
    const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode);
    if (referrer) {
      db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.id, newUserId);
      db.prepare('UPDATE users SET points = points + 1000 WHERE id = ?').run(referrer.id);
      db.prepare('UPDATE users SET points = points + 1000 WHERE id = ?').run(newUserId);
      const insertPtx = db.prepare('INSERT INTO point_transactions (user_id, amount, reason) VALUES (?, ?, ?)');
      insertPtx.run(referrer.id, 1000, '추천인 보상');
      insertPtx.run(newUserId, 1000, '추천 가입 보상');
    }
  }
  res.status(201).json({ ok: true });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.ip || '';
  const userAgent = req.headers['user-agent'] || '';
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  const record = (userId, success) =>
    db
      .prepare('INSERT INTO login_logs (user_id, username, ip, user_agent, success) VALUES (?, ?, ?, ?, ?)')
      .run(userId, username || null, String(ip), userAgent, success ? 1 : 0);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    record(user ? user.id : null, 0);
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
  if (user.active === 0) {
    record(user.id, 0);
    return res.status(403).json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' });
  }
  record(user.id, 1);
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
