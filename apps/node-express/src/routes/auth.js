const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.post('/signup', async (req, res) => {
  const { username, password, name, phone, postcode, address, addressDetail } = req.body;
  if (!username || !password || !name || !phone || !postcode || !address) {
    return res.status(400).json({ error: 'Username, password, name, phone, and address are required.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken.' });
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
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
