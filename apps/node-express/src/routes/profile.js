const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_EXT.has(path.extname(file.originalname).toLowerCase()));
  },
});

function toProfile(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    bio: row.bio,
    avatarUrl: row.avatar_url,
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

router.post('/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Invalid or missing image file.' });
  }
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(req.file.filename, req.session.user.id);
  res.json({ avatarUrl: req.file.filename });
});

module.exports = router;
