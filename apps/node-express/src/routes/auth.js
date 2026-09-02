const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-please-change-0001';

router.post('/signup', async (req, res) => {
  const { username, password, name, phone, email, postcode, address, addressDetail, referralCode } = req.body;
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
    `INSERT INTO users (username, password_hash, role, name, phone, email, postcode, address, address_detail, referral_code)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(username, passwordHash, role, name, phone, email || null, postcode, address, addressDetail || null, referralCodeForUser);
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
  req.session.user = { id: user.id, username: user.username, role: user.role, membershipTier: user.membership_tier };
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.post('/forgot', (req, res) => {
  const { account } = req.body;
  if (!account) {
    return res.status(400).json({ error: '아이디 또는 이메일을 입력해주세요.' });
  }
  const user = db
    .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
    .get(account, account);
  if (!user) {
    return res.status(404).json({ error: '가입된 계정을 찾을 수 없습니다.' });
  }
  const resetToken = Buffer.from(String(user.id)).toString('base64');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(
    resetToken,
    expires,
    user.id
  );
  res.json({ ok: true, message: '비밀번호 재설정 링크를 발송했습니다.', resetToken });
});

router.post('/reset', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: '토큰과 새 비밀번호(최소 8자)를 입력해주세요.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ error: '유효하지 않은 토큰입니다.' });
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(
    newHash,
    user.id
  );
  res.json({ ok: true });
});

router.post('/token', requireAuth, (req, res) => {
  const { id, username, role } = req.session.user;
  const token = jwt.sign({ sub: String(id), username, role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, tokenType: 'Bearer' });
});

router.get('/whoami', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Bearer 토큰이 필요합니다.' });
  }
  try {
    const claims = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256', 'none'] });
    res.json({ id: claims.sub, username: claims.username, role: claims.role });
  } catch (err) {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
});

module.exports = router;
