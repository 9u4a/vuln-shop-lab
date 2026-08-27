const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new MongoClient(MONGO_URL);

let activityCollection = null;

const SEED_ACTIVITY = [
  { username: '9u4a', action: 'login', detail: '관리자 콘솔 접속', at: '2026-08-20T09:00:00Z' },
  { username: 'admin', action: 'product.update', detail: '상품 #3 재고 조정', at: '2026-08-21T10:15:00Z' },
  { username: 'user1', action: 'search', detail: '기계식 키보드', at: '2026-08-22T11:30:00Z' },
  { username: 'user1', action: 'order.create', detail: '주문 order_seed_1', at: '2026-08-22T11:45:00Z' },
  { username: 'user2', action: 'search', detail: '무선 마우스 로지텍', at: '2026-08-23T14:05:00Z' },
  { username: 'user2', action: 'review.create', detail: '상품 #2 리뷰 작성', at: '2026-08-23T14:20:00Z' },
  { username: 'user3', action: 'search', detail: '모니터 암 듀얼', at: '2026-08-24T16:40:00Z' },
];

async function initMongo() {
  await client.connect();
  activityCollection = client.db('vulnshop').collection('activity');
  const count = await activityCollection.countDocuments();
  if (count === 0) {
    await activityCollection.insertMany(SEED_ACTIVITY.map((d) => ({ ...d })));
  }
}

function getActivityCollection() {
  return activityCollection;
}

module.exports = { initMongo, getActivityCollection };
