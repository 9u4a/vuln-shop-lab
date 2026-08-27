const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getActivityCollection } = require('../mongo');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const collection = getActivityCollection();
  if (!collection) return res.status(503).json({ error: '활동 로그를 사용할 수 없습니다.' });

  const username = req.query.username || req.session.user.username;
  const items = await collection
    .find({ username })
    .project({ _id: 0 })
    .sort({ at: -1 })
    .toArray();
  res.json({ activity: items });
});

module.exports = router;
