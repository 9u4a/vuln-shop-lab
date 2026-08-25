const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, name, phone, postcode, address, addressDetail } = req.body;
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
  db.prepare(
    `INSERT INTO users (username, password_hash, role, name, phone, postcode, address, address_detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(username, passwordHash, role, name, phone, postcode, address, addressDetail || null);
  res.status(201).json({ ok: true });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
