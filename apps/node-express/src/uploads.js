const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
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

module.exports = { upload, uploadDir };
