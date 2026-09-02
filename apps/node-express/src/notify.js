const db = require('./db');

// 사용자에게 인앱 알림을 남긴다.
function notify(userId, type, title, body, link) {
  if (!userId) return;
  db.prepare(
    'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, type || null, title || null, body || null, link || null);
}

module.exports = { notify };
