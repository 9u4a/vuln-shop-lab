const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new MongoClient(MONGO_URL);

let activityCollection = null;

const CURATED_ACTIVITY = [
  { username: '9u4a', action: 'login', detail: '관리자 콘솔 접속', at: '2026-08-20T09:00:00Z' },
  { username: 'admin', action: 'product.update', detail: '상품 #3 재고 조정', at: '2026-08-21T10:15:00Z' },
  { username: 'user1', action: 'search', detail: '기계식 키보드', at: '2026-08-22T11:30:00Z' },
  { username: 'user1', action: 'order.create', detail: '주문 order_seed_1', at: '2026-08-22T11:45:00Z' },
  { username: 'user2', action: 'search', detail: '무선 마우스 로지텍', at: '2026-08-23T14:05:00Z' },
  { username: 'user2', action: 'review.create', detail: '상품 #2 리뷰 작성', at: '2026-08-23T14:20:00Z' },
  { username: 'user3', action: 'search', detail: '모니터 암 듀얼', at: '2026-08-24T16:40:00Z' },
];

// 대량 더미 활동 로그 생성(사용자 × 액션 순환)
const ACT_ACTIONS = [
  ['login', '로그인'],
  ['search', '상품 검색'],
  ['product.view', '상품 상세 조회'],
  ['cart.add', '장바구니 담기'],
  ['order.create', '주문 생성'],
  ['review.create', '리뷰 작성'],
];
const SEED_ACTIVITY = [...CURATED_ACTIVITY];
for (let n = 0; SEED_ACTIVITY.length < 80; n += 1) {
  const username = `user${1 + (n % 60)}`;
  const [action, label] = ACT_ACTIONS[n % ACT_ACTIONS.length];
  const day = 20 + (n % 10);
  const hour = String(8 + (n % 12)).padStart(2, '0');
  SEED_ACTIVITY.push({ username, action, detail: `${label} #${n + 1}`, at: `2026-08-${day}T${hour}:00:00Z` });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function initMongo(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await client.connect();
      activityCollection = client.db('vulnshop').collection('activity');
      const count = await activityCollection.countDocuments();
      if (count === 0) {
        await activityCollection.insertMany(SEED_ACTIVITY.map((d) => ({ ...d })));
      }
      console.log('mongo connected');
      return;
    } catch (err) {
      activityCollection = null;
      console.error(`mongo connect attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) await sleep(delayMs);
    }
  }
  console.error('mongo connect gave up — activity feed disabled until restart');
}

function getActivityCollection() {
  return activityCollection;
}

module.exports = { initMongo, getActivityCollection };
