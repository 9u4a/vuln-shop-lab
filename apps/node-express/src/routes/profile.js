const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../uploads');

const router = express.Router();

function toProfile(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    name: row.name,
    phone: row.phone,
    postcode: row.postcode,
    address: row.address,
    addressDetail: row.address_detail,
    createdAt: row.created_at,
  };
}

router.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  res.json({ profile: toProfile(row) });
});

router.put('/', requireAuth, (req, res) => {
  const { bio } = req.body;
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio ?? null, req.session.user.id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  res.json({ profile: toProfile(row) });
});

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호(최소 8자)를 입력해주세요.' });
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const matches = await bcrypt.compare(currentPassword, row.password_hash);
  if (!matches) {
    return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, row.id);
  res.json({ ok: true });
});

router.post('/verify-password', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
  res.json({ ok: true });
});

router.post('/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 없거나 형식이 올바르지 않습니다.' });
  }
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(req.file.filename, req.session.user.id);
  res.json({ avatarUrl: req.file.filename });
});

module.exports = router;
