const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'app.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    bio TEXT,
    avatar_url TEXT,
    name TEXT,
    phone TEXT,
    postcode TEXT,
    address TEXT,
    address_detail TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    points INTEGER NOT NULL DEFAULT 0,
    referral_code TEXT,
    referred_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    ip TEXT,
    user_agent TEXT,
    success INTEGER NOT NULL DEFAULT 0,
    at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    category TEXT,
    brand TEXT,
    sku TEXT,
    gender TEXT,
    color TEXT,
    material TEXT,
    stock INTEGER NOT NULL DEFAULT 100,
    option_name TEXT,
    option_values TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    secret INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount REAL NOT NULL,
    webhook_url TEXT,
    toss_order_id TEXT UNIQUE,
    toss_payment_key TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    option_value TEXT
  );

  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'amount',
    discount_value INTEGER NOT NULL DEFAULT 0,
    min_order_amount INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    used INTEGER NOT NULL DEFAULT 0,
    claimed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    image_url TEXT,
    link_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    username TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    secret INTEGER NOT NULL DEFAULT 0,
    answer TEXT,
    answered_by TEXT,
    answered_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    order_id INTEGER REFERENCES orders(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    refund_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS restock_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    notified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

for (const stmt of [
  'ALTER TABLE users ADD COLUMN bio TEXT',
  'ALTER TABLE users ADD COLUMN avatar_url TEXT',
  'ALTER TABLE users ADD COLUMN name TEXT',
  'ALTER TABLE users ADD COLUMN phone TEXT',
  'ALTER TABLE users ADD COLUMN postcode TEXT',
  'ALTER TABLE users ADD COLUMN address TEXT',
  'ALTER TABLE users ADD COLUMN address_detail TEXT',
  'ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE products ADD COLUMN category TEXT',
  'ALTER TABLE products ADD COLUMN brand TEXT',
  'ALTER TABLE products ADD COLUMN sku TEXT',
  'ALTER TABLE products ADD COLUMN gender TEXT',
  'ALTER TABLE products ADD COLUMN color TEXT',
  'ALTER TABLE products ADD COLUMN material TEXT',
  "ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 100",
  'ALTER TABLE products ADD COLUMN option_name TEXT',
  'ALTER TABLE products ADD COLUMN option_values TEXT',
  'ALTER TABLE order_items ADD COLUMN option_value TEXT',
  'ALTER TABLE faqs ADD COLUMN user_id INTEGER REFERENCES users(id)',
  'ALTER TABLE notices ADD COLUMN image_url TEXT',
  'ALTER TABLE reviews ADD COLUMN image_url TEXT',
  'ALTER TABLE reviews ADD COLUMN secret INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN referral_code TEXT',
  'ALTER TABLE users ADD COLUMN referred_by INTEGER',
]) {
  try {
    db.exec(stmt);
  } catch (err) {
    // column already exists on databases created before this migration
  }
}

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const seedImagesDir = path.join(__dirname, '..', 'seed-images');
function seedImage(filename) {
  const dest = path.join(uploadDir, filename);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(path.join(seedImagesDir, filename), dest);
  }
  return filename;
}

// 1. Seed Users (if missing)
const seedUsers = [
  { username: '9u4a', password: '9u4a', role: 'system_admin', name: '최고관리자', phone: '010-1234-5678', bio: 'Vulnlab Shop 시스템의 총괄 관리자 계정입니다.', postcode: '10014', address: '경기도 성남시 분당구 데모로 63', address_detail: '9층' },
  { username: 'admin', password: 'admin', role: 'admin', name: '상점관리자', phone: '010-5678-1234', bio: '상품 관리 및 고객 문의 처리를 전담하는 상점 관리자 계정입니다.', postcode: '10001', address: '서울특별시 강남구 테스트로 12', address_detail: '302호' },
  { username: 'user1', password: 'user1', role: 'user', name: '김철수', phone: '010-1111-2222', bio: '새로운 테크 기기에 관심이 많은 얼리어답터 김철수입니다.', postcode: '10002', address: '서울특별시 마포구 샘플길 34', address_detail: '101동 203호' },
  { username: 'user2', password: 'user2', role: 'user', name: '이영희', phone: '010-3333-4444', bio: '깔끔하고 세련된 데스크테리어를 좋아하는 이영희입니다.', postcode: '10003', address: '서울특별시 종로구 데모대로 56', address_detail: '2층' },
  { username: 'user3', password: 'user3', role: 'user', name: '박민수', phone: '010-5555-6666', bio: '가성비 좋고 성능 확실한 스마트 오피스 제품을 선호하는 박민수입니다.', postcode: '10005', address: '서울특별시 영등포구 더미길 90', address_detail: '반지하 B01호' },
];

for (const u of seedUsers) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (username, password_hash, role, name, phone, bio, postcode, address, address_detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      u.username,
      bcrypt.hashSync(u.password, 10),
      u.role,
      u.name,
      u.phone,
      u.bio,
      u.postcode,
      u.address,
      u.address_detail
    );
  } else {
    // Ensure all details are populated for existing users
    db.prepare(`
      UPDATE users SET
        role = ?, name = ?, phone = ?, bio = ?, postcode = ?, address = ?, address_detail = ?, active = 1
      WHERE id = ?
    `).run(
      u.role,
      u.name || existing.name,
      u.phone || existing.phone,
      u.bio || existing.bio,
      u.postcode || existing.postcode,
      u.address || existing.address,
      u.address_detail || existing.address_detail,
      existing.id
    );
  }
}

// 1b. Bulk demo users (user4..user60) — 서버 기동 시 항목당 대량 더미 반영
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
const GIVEN = ['민준', '서연', '도윤', '하은', '시우', '지우', '예준', '수아', '주원', '지민', '건우', '유진', '현우', '채원', '지호', '다은', '우진', '서윤', '선우', '예은'];
const CITIES = ['서울특별시 강남구', '서울특별시 마포구', '부산광역시 해운대구', '대구광역시 수성구', '인천광역시 연수구', '광주광역시 서구', '대전광역시 유성구', '경기도 성남시 분당구', '경기도 수원시 영통구', '강원특별자치도 춘천시'];
const ROADS = ['테헤란로', '월드컵북로', '센텀중앙로', '달구벌대로', '컨벤시아대로', '상무중앙로', '대학로', '판교역로', '광교중앙로', '중앙로'];
const pick = (arr, i) => arr[i % arr.length];
const insertBulkUser = db.prepare(
  `INSERT OR IGNORE INTO users (username, password_hash, role, name, phone, bio, postcode, address, address_detail, active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
);
for (let n = 4; n <= 60; n += 1) {
  const username = `user${n}`;
  const name = pick(SURNAMES, n) + pick(GIVEN, n * 3);
  const phone = `010-${String(1000 + (n * 7) % 9000)}-${String(1000 + (n * 13) % 9000)}`;
  const postcode = String(10000 + n);
  const address = `${pick(CITIES, n)} ${pick(ROADS, n)} ${10 + (n % 90)}`;
  insertBulkUser.run(
    username,
    bcrypt.hashSync(username, 10),
    'user',
    name,
    phone,
    `${name}의 데모 계정입니다.`,
    postcode,
    address,
    `${100 + (n % 900)}호`
  );
}

// 2. Seed Products (if missing)
const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (productCount === 0) {
  const insert = db.prepare(
    `INSERT INTO products
      (name, description, price, image_url, category, brand, sku, gender, color, material, stock, option_name, option_values)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const TOP = seedImage('apparel-top.svg');
  const BOTTOM = seedImage('apparel-bottom.svg');
  const BAG = seedImage('apparel-bag.svg');
  const HAT = seedImage('apparel-hat.svg');
  const ACC = seedImage('apparel-acc.svg');
  const seed = [
    // 상의 (top)
    ['베이식 크루넥 티셔츠', '매일 입기 좋은 20수 싱글 코튼 크루넥 티셔츠입니다. 적당한 두께감과 부드러운 촉감으로 사계절 데일리로 활용하기 좋습니다.', 19000, TOP, 'top', 'Basiclab', 'TOP-001', '공용', '화이트', '코튼', 120, '사이즈', 'S,M,L,XL'],
    ['옥스포드 셔츠', '단정한 클래식 핏의 옥스포드 코튼 셔츠. 출근룩부터 캐주얼까지 폭넓게 매치할 수 있는 스카이블루 컬러입니다.', 39000, TOP, 'top', 'Basiclab', 'TOP-002', '남성', '스카이블루', '코튼', 64, '사이즈', 'S,M,L,XL'],
    ['오버핏 맨투맨', '기모 없이도 포근한 헤비 코튼 오버핏 맨투맨입니다. 넉넉한 실루엣으로 편안하게 즐기는 그레이 컬러.', 45000, TOP, 'top', 'Urban', 'TOP-003', '공용', '그레이', '코튼', 48, '사이즈', 'M,L,XL'],
    ['울 니트 가디건', '보온성 좋은 울 혼방 니트 가디건. 부드러운 아이보리 톤으로 이너와 아우터 어디에나 잘 어울립니다.', 59000, TOP, 'top', 'Maison', 'TOP-004', '여성', '아이보리', '울', 30, '사이즈', 'S,M,L'],
    // 바지 (bottom)
    ['와이드 슬랙스', '군더더기 없는 드레이프가 매력적인 와이드 슬랙스. 신축성 있는 폴리 혼방으로 활동성까지 챙겼습니다.', 49000, BOTTOM, 'bottom', 'Basiclab', 'BOT-001', '여성', '블랙', '폴리에스터', 52, '사이즈', 'S,M,L'],
    ['스트레이트 데님', '적당한 두께의 논워싱 인디고 데님. 유행을 타지 않는 스트레이트 핏으로 오래 입기 좋습니다.', 55000, BOTTOM, 'bottom', 'Urban', 'BOT-002', '남성', '인디고', '데님', 40, '사이즈', '28,30,32,34'],
    ['코튼 조거팬츠', '허리 밴딩과 발목 조임으로 편안한 코튼 조거팬츠. 카키 컬러로 캐주얼 무드를 완성합니다.', 39000, BOTTOM, 'bottom', 'Urban', 'BOT-003', '공용', '카키', '코튼', 0, '사이즈', 'M,L,XL'],
    ['치노 팬츠', '깔끔한 세미 슬림 핏의 베이지 치노 팬츠. 셔츠와 매치하면 단정한 오피스룩이 완성됩니다.', 42000, BOTTOM, 'bottom', 'Basiclab', 'BOT-004', '남성', '베이지', '코튼', 58, '사이즈', '30,32,34'],
    // 가방 (bag)
    ['캔버스 토트백', '데일리로 부담 없는 대용량 캔버스 토트백. 노트북과 A4 서류가 넉넉히 들어갑니다.', 29000, BAG, 'bag', 'Maison', 'BAG-001', '공용', '아이보리', '캔버스', 90, '색상', 'Ivory,Black'],
    ['레더 크로스백', '유러피안 무드의 소가죽 크로스백. 데일리부터 나들이까지 어울리는 브라운 컬러입니다.', 89000, BAG, 'bag', 'Maison', 'BAG-002', '여성', '브라운', '레더', 22, '색상', 'Brown,Black'],
    ['나일론 백팩', '가볍고 견고한 나일론 백팩. 15인치 노트북 수납과 다양한 포켓으로 실용성이 뛰어납니다.', 69000, BAG, 'bag', 'Urban', 'BAG-003', '공용', '블랙', '나일론', 44, '색상', 'Black,Navy'],
    // 모자 (hat)
    ['코튼 볼캡', '기본에 충실한 코튼 볼캡. 조절 스트랩으로 누구나 편하게 착용할 수 있는 블랙 컬러입니다.', 25000, HAT, 'hat', 'Basiclab', 'HAT-001', '공용', '블랙', '코튼', 110, '사이즈', 'Free'],
    ['버킷햇', '자외선 차단과 스타일을 동시에. 부드러운 베이지 코튼 버킷햇입니다.', 27000, HAT, 'hat', 'Urban', 'HAT-002', '여성', '베이지', '코튼', 6, '사이즈', 'Free'],
    ['니트 비니', '겨울 필수 아이템, 신축성 좋은 아크릴 니트 비니. 어떤 코디에도 잘 어울리는 차콜 컬러.', 22000, HAT, 'hat', 'Urban', 'HAT-003', '공용', '차콜', '아크릴', 70, '사이즈', 'Free'],
    // 액세서리 (acc)
    ['실버 체인 목걸이', '변색에 강한 스테인리스 소재의 데일리 체인 목걸이. 심플한 실버 톤으로 포인트를 더합니다.', 35000, ACC, 'acc', 'Maison', 'ACC-001', '여성', '실버', '스테인리스', 80, '색상', 'Silver,Gold'],
    ['가죽 벨트', '견고한 소가죽 벨트. 캐주얼과 슬랙스 모두에 어울리는 브라운 컬러입니다.', 32000, ACC, 'acc', 'Basiclab', 'ACC-002', '남성', '브라운', '레더', 55, '사이즈', 'M,L,XL'],
  ];
  // 대량 더미 상품 생성(카테고리별로 순환하며 60종까지 채움)
  const CATS = [
    { slug: 'top', img: TOP, prefix: 'TOP', items: ['크루넥 티셔츠', '헨리넥 티셔츠', '피케 폴로', '스트라이프 셔츠', '린넨 셔츠', '후드 집업', '라운드 니트', '카라 니트'], opt: 'S,M,L,XL', mats: ['코튼', '린넨', '울', '폴리에스터'] },
    { slug: 'bottom', img: BOTTOM, prefix: 'BOT', items: ['테이퍼드 슬랙스', '와이드 데님', '슬림 치노', '카고 팬츠', '트랙 팬츠', '숏 팬츠', '코듀로이 팬츠'], opt: '28,30,32,34', mats: ['코튼', '데님', '폴리에스터', '코듀로이'] },
    { slug: 'bag', img: BAG, prefix: 'BAG', items: ['에코 토트백', '미니 크로스백', '데일리 백팩', '메신저백', '더플백', '웨이스트백'], opt: 'Free', mats: ['캔버스', '나일론', '레더', '폴리에스터'] },
    { slug: 'hat', img: HAT, prefix: 'HAT', items: ['볼캡', '버킷햇', '니트 비니', '베레모', '스트로우햇'], opt: 'Free', mats: ['코튼', '아크릴', '울', '스트로우'] },
    { slug: 'acc', img: ACC, prefix: 'ACC', items: ['체인 목걸이', '가죽 벨트', '실버 링', '머플러', '양말 세트', '선글라스'], opt: 'Free', mats: ['스테인리스', '레더', '실버', '아크릴'] },
  ];
  const BRANDS = ['Basiclab', 'Urban', 'Maison'];
  const GENDERS = ['공용', '남성', '여성'];
  const COLORS = ['화이트', '블랙', '그레이', '네이비', '베이지', '카키', '브라운', '아이보리', '차콜', '인디고'];
  let counter = { top: 4, bottom: 4, bag: 3, hat: 3, acc: 2 };
  for (let n = 0; seed.length < 60; n += 1) {
    const c = CATS[n % CATS.length];
    counter[c.slug] += 1;
    const seq = counter[c.slug];
    const item = pick(c.items, n);
    const price = 15000 + ((n * 3137) % 80) * 1000;
    const stock = (n % 11 === 0) ? 0 : 20 + (n * 7) % 130;
    seed.push([
      `${pick(BRANDS, n)} ${item}`,
      `${item} 상품입니다. 데일리로 활용하기 좋은 ${pick(c.mats, n)} 소재의 ${pick(COLORS, n)} 컬러 아이템입니다.`,
      price, c.img, c.slug, pick(BRANDS, n),
      `${c.prefix}-${String(seq).padStart(3, '0')}`,
      pick(GENDERS, n), pick(COLORS, n), pick(c.mats, n), stock,
      c.slug === 'bottom' ? '사이즈' : (c.slug === 'top' ? '사이즈' : '옵션'),
      c.opt,
    ]);
  }
  for (const row of seed) insert.run(...row);
}

// 3. Seed FAQs (if missing)
const faqCount = db.prepare('SELECT COUNT(*) AS count FROM faqs').get().count;
if (faqCount === 0) {
  const insertFaq = db.prepare('INSERT INTO faqs (question, answer, user_id) VALUES (?, ?, ?)');
  const adminId = db.prepare("SELECT id FROM users WHERE username = 'admin'").get()?.id || 1;
  const systemAdminId = db.prepare("SELECT id FROM users WHERE username = '9u4a'").get()?.id || 1;
  const faqs = [
    ["배송 기간은 얼마나 걸리나요?", "결제 완료 후 서울 및 수도권 지역은 대개 영업일 기준 1~2일 내에 배송되며, 도서산간 지역은 2~4일 정도 소요될 수 있습니다. 택배사 사정에 따라 다소 변동될 수 있습니다.", adminId],
    ["반품 및 교환 신청 방법과 규정이 궁금합니다.", "상품 수령 후 7일 이내에 구매 확정을 하지 않으신 상태에서 신청 가능합니다. 단, 상품이 훼손되었거나 포장을 개봉하여 가치가 훼손된 경우에는 교환/반품이 어려울 수 있습니다. 마이페이지의 주문 목록에서 신청하시거나 고객센터에 문의해 주세요.", adminId],
    ["비회원도 상품 구매가 가능한가요?", "저희 쇼핑몰은 회원제 서비스로 운영되고 있으며, 비회원 구매는 지원하지 않습니다. 이메일과 간단한 정보 입력만으로 10초 만에 간편히 가입하여 쇼핑을 즐기실 수 있습니다.", adminId],
    ["결제 가능한 수단에는 어떤 것들이 있나요?", "토스페이먼츠 안전 결제를 통해 신용카드 결제 및 계좌이체, 토스페이, 삼성페이 등 다양한 간편결제 수단을 완벽하게 이용하실 수 있습니다.", systemAdminId],
    ["개인정보 보호 및 보안 관련 정책이 어떻게 되나요?", "저희는 회원님의 모든 패스워드를 최신 암호화 알고리즘(BCrypt)으로 처리하여 철저하게 보호하고 있으며, 결제 정보 등 주요 데이터 역시 안전한 보안 프레임워크를 통해 철저하게 관리되고 있으니 안심하셔도 됩니다.", systemAdminId]
  ];
  // 대량 더미 FAQ 생성(주제 순환)
  const FAQ_TOPICS = [
    ['배송', '배송비는 얼마인가요', '3만원 이상 구매 시 무료이며, 미만은 3,000원이 부과됩니다.'],
    ['배송', '해외 배송도 되나요', '현재는 국내 배송만 지원하고 있으며 해외 배송은 준비 중입니다.'],
    ['교환/반품', '단순 변심 반품 시 배송비는', '단순 변심의 경우 왕복 배송비가 고객 부담으로 발생합니다.'],
    ['교환/반품', '교환은 몇 번까지 가능한가요', '동일 상품 기준 1회 교환이 가능하며 재고 상황에 따라 다를 수 있습니다.'],
    ['결제', '무통장 입금도 가능한가요', '토스페이먼츠 계좌이체로 대체되며 가상계좌 입금이 지원됩니다.'],
    ['결제', '해외 카드로 결제되나요', '일부 해외 발급 카드는 결제가 제한될 수 있습니다.'],
    ['회원', '아이디를 변경할 수 있나요', '아이디는 변경이 불가하며 탈퇴 후 재가입이 필요합니다.'],
    ['회원', '휴면 계정은 어떻게 되나요', '1년 이상 미접속 시 휴면 전환되며 재로그인으로 해제됩니다.'],
    ['쿠폰', '쿠폰은 중복 사용되나요', '주문당 1장의 쿠폰만 적용 가능합니다.'],
    ['상품', '재입고 알림을 받고 싶어요', '품절 상품 상세에서 재입고 알림을 신청할 수 있습니다.'],
  ];
  const faqAuthors = [adminId, systemAdminId];
  for (let n = 0; faqs.length < 60; n += 1) {
    const t = FAQ_TOPICS[n % FAQ_TOPICS.length];
    const round = Math.floor(n / FAQ_TOPICS.length) + 1;
    faqs.push([`[${t[0]}] ${t[1]}? (${round})`, t[2], pick(faqAuthors, n)]);
  }
  for (const row of faqs) insertFaq.run(...row);
}

// 3b. Seed Q&A questions (if missing)
const questionCount = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count;
if (questionCount === 0) {
  const user1 = db.prepare("SELECT id FROM users WHERE username = 'user1'").get()?.id || 1;
  const user2 = db.prepare("SELECT id FROM users WHERE username = 'user2'").get()?.id || 1;
  const insertAnswered = db.prepare(
    "INSERT INTO questions (user_id, username, title, body, secret, answer, answered_by, answered_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  );
  const insertOpen = db.prepare(
    'INSERT INTO questions (user_id, username, title, body, secret) VALUES (?, ?, ?, ?, ?)'
  );
  insertAnswered.run(
    user1, 'user1', '주문한 상품 배송이 언제 시작되나요?',
    '어제 결제를 완료했는데 아직 배송 시작 알림이 없어서 문의드립니다.', 0,
    '안녕하세요. 결제 확인 후 영업일 기준 1일 내 순차 출고되고 있으며, 오늘 중 출고 예정입니다. 이용에 불편을 드려 죄송합니다.',
    'admin'
  );
  insertOpen.run(user2, 'user2', '사이즈 교환도 가능한가요?', 'M 사이즈를 주문했는데 L로 교환하고 싶습니다. 절차가 궁금합니다.', 0);
  insertOpen.run(user1, 'user1', '(비밀글) 결제 영수증 재발급 문의', '세금계산서 처리 때문에 영수증 재발급이 필요합니다. 계정 정보 확인 부탁드립니다.', 1);

  // 대량 더미 Q&A 생성(답변완료/미답변/비밀글 순환)
  const qUsers = db.prepare("SELECT id, username FROM users WHERE role = 'user' ORDER BY id").all();
  const Q_TITLES = ['배송 조회는 어디서 하나요', '주문 취소하고 싶어요', '색상 문의드립니다', '재입고 예정일이 궁금해요', '쿠폰 적용이 안돼요', '사이즈 추천 부탁드려요', '영수증 발급 요청', '주소 변경 가능한가요', '적립금은 어떻게 쓰나요', '상품 상세 사이즈표 문의'];
  const Q_BODY = '문의 내용입니다. 확인 후 안내 부탁드립니다.';
  const Q_ANSWER = '안녕하세요. 문의 주신 내용 확인하여 순차적으로 안내드리고 있습니다. 감사합니다.';
  for (let n = 0; n < 57 && qUsers.length; n += 1) {
    const u = pick(qUsers, n);
    const secret = n % 7 === 0 ? 1 : 0;
    const title = `${pick(Q_TITLES, n)} (${n + 1})`;
    if (n % 3 === 0) {
      insertAnswered.run(u.id, u.username, title, Q_BODY, secret, Q_ANSWER, 'admin');
    } else {
      insertOpen.run(u.id, u.username, title, Q_BODY, secret);
    }
  }
}

// 4. Seed Notices (if missing)
const noticeCount = db.prepare('SELECT COUNT(*) AS count FROM notices').get().count;
if (noticeCount === 0) {
  const insertNotice = db.prepare('INSERT INTO notices (title, body) VALUES (?, ?)');
  const notices = [
    [
      "[공지] 신규 회원 가입 환영 적립금 웰컴 이벤트 안내",
      "안녕하세요. Vulnlab Shop에 오신 것을 진심으로 환영합니다!\n\n현재 신규 가입하신 모든 회원님들께 첫 구매 시 즉시 사용 가능한 풍성한 웰컴 할인 혜택을 제공하고 있습니다. 마이페이지에서 가입 직후 확인해 보세요.\n앞으로도 더 합리적이고 프리미엄한 오피스 가젯과 테크 액세서리들로 보답하겠습니다.\n감사합니다."
    ],
    [
      "[공지] 개인정보 처리방침 일부 개정 예정 공지",
      "안녕하세요. Vulnlab Shop입니다.\n\n회원 여러분의 소중한 개인정보를 보다 투명하게 보호하고, 최신 법률 요건을 충족하기 위해 개인정보 처리방침이 일부 개정될 예정입니다.\n\n- 주요 개정 사유: 신규 간편결제 연동에 따른 수탁업체 리스트 현행화\n- 적용 일자: 2026년 9월 1일\n\n상세한 개정 대조표는 공지사항 첨부 혹은 약관 페이지를 참고 바라며, 관련 문의는 당사 고객지원 센터로 전달 주시면 성심껏 답변 드리겠습니다."
    ],
    [
      "[점검] 토스페이먼츠 결제 시스템 정기 보안 점검 안내",
      "안정적이고 강력한 결제 보안 환경을 제공하기 위해 PG 결제 시스템의 정기 정밀 정검이 아래와 같이 예정되어 있습니다.\n\n- 점검 시간: 2026년 8월 30일(일요일) 새벽 02:00 ~ 04:00 (약 2시간)\n- 작업 영향: 점검 시간 동안 간헐적으로 신용카드 및 토스페이 결제 승인 오류 또는 결제 지연이 발생할 수 있습니다.\n\n사용자 여러분의 너른 양해를 부탁드리며, 점검 시간 전에 필요한 주문을 완료해 주시면 더욱 매끄러운 이용이 가능합니다. 감사합니다."
    ],
    [
      "[안내] 하절기 기상 악화(태풍)로 인한 일부 지역 배송 지연 안내",
      "최근 한반도를 통과하는 강력한 하절기 태풍의 영향으로 인하여, 남부 지방 및 제주/도서 지역으로의 택배 배송 배차가 일부 지연되고 있습니다.\n\n- 지연 예상 지역: 부산, 울산, 경남, 전남 전체 및 제주 특별자치도\n- 예상 지연 일수: 기존 배송일보다 약 1~2영업일 지연 예상\n\n상품을 기다리시는 고객님들께 심려를 끼쳐드려 대단히 죄송하며, 기상 특보가 해제되는 대로 신속하고 안전하게 배송이 재개될 수 있도록 물류팀에서 최선을 다하겠습니다."
    ]
  ];
  // 대량 더미 공지 생성(카테고리 순환)
  const N_KINDS = [['공지', '신규 입점 브랜드 안내'], ['이벤트', '주간 특가 상품 안내'], ['점검', '시스템 정기 점검 안내'], ['안내', '배송 정책 변경 안내'], ['공지', '고객센터 운영시간 변경']];
  for (let n = 0; notices.length < 60; n += 1) {
    const k = N_KINDS[n % N_KINDS.length];
    notices.push([
      `[${k[0]}] ${k[1]} (${n + 1})`,
      `안녕하세요. Vulnlab Shop입니다.\n\n${k[1]} 관련하여 안내드립니다. 자세한 내용은 본문을 확인해 주세요.\n\n감사합니다.`,
    ]);
  }
  for (const row of notices) insertNotice.run(...row);
}

// 4.5 Seed Events (if missing)
const eventCount = db.prepare('SELECT COUNT(*) AS count FROM events').get().count;
if (eventCount === 0) {
  const insertEvent = db.prepare(
    'INSERT INTO events (title, body, image_url, link_url, active, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const events = [
    [
      '여름 데스크 셋업 페어',
      '<h3 style="margin-top:0">인기 아이템 최대 30% 할인</h3><p>키보드 · 모니터 · 조명까지, 지금 가장 많이 담는 데스크 셋업 아이템을 한정 수량 특가로 준비했습니다.</p><p><strong>8월 한정 · 재고 소진 시 조기 종료</strong></p>',
      null,
      '/products',
      1,
      '2026-08-01T00:00:00Z',
      '2026-12-31T23:59:59Z',
    ],
    [
      '신규 회원 웰컴 쿠폰',
      '<p>지금 가입하면 <strong>첫 구매 5,000원 즉시 할인</strong> 쿠폰을 드려요.</p><p>가입 후 마이페이지에서 바로 확인하실 수 있습니다.</p>',
      null,
      '/signup',
      1,
      '2026-08-01T00:00:00Z',
      '2026-12-31T23:59:59Z',
    ],
    [
      '무료배송 위크',
      '<p>이번 주 모든 주문 <strong>무료배송</strong> — 별도 쿠폰 없이 자동 적용됩니다.</p>',
      null,
      '/products',
      1,
      '2026-08-01T00:00:00Z',
      '2026-12-31T23:59:59Z',
    ],
  ];
  // 대량 더미 이벤트 생성(활성/비활성 순환)
  const E_TITLES = ['가을 신상 프리뷰', '주말 타임세일', '브랜드 위크', '리뷰 이벤트', '친구 초대 혜택', '멤버십 더블 적립', '시즌 오프 클리어런스', '단독 특가전'];
  for (let n = 0; events.length < 60; n += 1) {
    const title = `${pick(E_TITLES, n)} (${n + 1})`;
    events.push([
      title,
      `<h3 style="margin-top:0">${title}</h3><p>지금 참여하고 다양한 혜택을 받아보세요. 기간 한정으로 진행됩니다.</p>`,
      null,
      '/products',
      n % 5 === 0 ? 0 : 1,
      null,
      null,
    ]);
  }
  for (const row of events) insertEvent.run(...row);
}

// 4.7 Seed Coupons (if missing)
const couponCount = db.prepare('SELECT COUNT(*) AS count FROM coupons').get().count;
if (couponCount === 0) {
  const insertCoupon = db.prepare(
    'INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order_amount, active, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const coupons = [
    ['WELCOME5000', '신규 가입 웰컴 쿠폰', '첫 구매 시 즉시 사용 가능한 5,000원 할인 쿠폰입니다.', 'amount', 5000, 0, 1, null],
    ['SUMMER10', '여름맞이 10% 할인', '3만원 이상 구매 시 10% 할인. 여름 데일리 웨어를 준비하세요.', 'percent', 10, 30000, 1, '2026-09-30T23:59:59Z'],
    ['FREESHIP3000', '무료배송 쿠폰', '배송비 3,000원 할인 쿠폰입니다.', 'amount', 3000, 0, 1, null],
  ];
  // 대량 더미 쿠폰 생성(정액/정률 순환, 고유 코드)
  for (let n = 0; coupons.length < 60; n += 1) {
    const isPercent = n % 2 === 0;
    const code = `PROMO${String(n + 1).padStart(4, '0')}`;
    coupons.push([
      code,
      isPercent ? `${5 + (n % 3) * 5}% 할인 쿠폰` : `${(1 + (n % 5)) * 1000}원 할인 쿠폰`,
      '기간 한정 프로모션 쿠폰입니다.',
      isPercent ? 'percent' : 'amount',
      isPercent ? 5 + (n % 3) * 5 : (1 + (n % 5)) * 1000,
      (n % 3) * 10000,
      n % 9 === 0 ? 0 : 1,
      null,
    ]);
  }
  for (const row of coupons) insertCoupon.run(...row);
}

// 5. Seed Reviews (if missing)
const reviewCount = db.prepare('SELECT COUNT(*) AS count FROM reviews').get().count;
if (reviewCount === 0) {
  const insertReview = db.prepare('INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)');
  const user1Id = db.prepare("SELECT id FROM users WHERE username = 'user1'").get()?.id;
  const user2Id = db.prepare("SELECT id FROM users WHERE username = 'user2'").get()?.id;
  const user3Id = db.prepare("SELECT id FROM users WHERE username = 'user3'").get()?.id;
  
  if (user1Id && user2Id && user3Id) {
    const reviews = [
      [1, user1Id, 5, "기본 티셔츠는 이게 국룰이네요. 비침 없고 목 늘어남도 없어서 색깔별로 재구매했습니다. 세탁 후에도 핏이 그대로예요."],
      [1, user2Id, 4, "촉감이 부드럽고 도톰해서 좋아요. 다만 화이트는 생각보다 살짝 크게 나와서 한 사이즈 작게 주문하시길 추천합니다."],
      [2, user3Id, 5, "옥스포드 원단이 탄탄하고 다림질도 잘 먹습니다. 스카이블루 색감이 화면보다 실물이 더 예뻐요. 출근용으로 딱입니다."],
      [3, user1Id, 5, "오버핏이라 편하게 걸치기 좋고 도톰해서 지금 날씨에 적당합니다. 그레이 톤이 무난해서 아무 하의에나 잘 어울려요."],
      [3, user2Id, 3, "핏이랑 두께는 만족스러운데 기모가 아니라 한겨울엔 조금 춥겠네요. 간절기용으로는 아주 좋습니다."],
      [4, user3Id, 4, "울 혼방이라 따뜻하고 보풀도 아직 없습니다. 아이보리 색이 은은해서 데일리로 자주 손이 가요."],
      [5, user2Id, 5, "슬랙스 드레이프가 예쁘게 떨어지고 신축성이 있어서 하루 종일 편했습니다. 블랙은 실패가 없네요."],
      [6, user1Id, 5, "논워싱 인디고라 처음엔 뻣뻣하지만 입을수록 길들여집니다. 스트레이트 핏이 군더더기 없어 오래 입을 것 같아요."],
      [7, user3Id, 5, "조거팬츠 밴딩이 편하고 카키 색이 코디하기 좋습니다. 집에서도 밖에서도 자주 입게 되네요."]
    ];
    for (const row of reviews) insertReview.run(...row);
    // 데모용: user2가 상품1에 남긴 후기를 비밀글로 표시
    db.prepare(
      'UPDATE reviews SET secret = 1 WHERE product_id = 1 AND user_id = ?'
    ).run(user2Id);

    // 대량 더미 후기 생성(상품 전반 × 사용자 순환)
    const rvUsers = db.prepare("SELECT id FROM users WHERE role = 'user' ORDER BY id").all().map((r) => r.id);
    const rvProducts = db.prepare('SELECT id FROM products ORDER BY id').all().map((r) => r.id);
    const RV_BODY = [
      '가격 대비 만족스러워요. 재구매 의사 있습니다.',
      '핏과 색감이 화면과 동일해서 좋았어요.',
      '배송이 빠르고 포장도 깔끔했습니다.',
      '무난하게 데일리로 입기 좋네요.',
      '소재가 생각보다 도톰하고 튼튼합니다.',
      '사이즈가 살짝 커서 한 치수 작게 추천해요.',
    ];
    let made = 0;
    for (let pi = 0; pi < rvProducts.length && made < 90; pi += 1) {
      const reviewsPerProduct = 1 + (pi % 2); // 상품당 1~2개
      for (let k = 0; k < reviewsPerProduct && made < 90; k += 1) {
        const uid = pick(rvUsers, pi * 2 + k + 3);
        const rating = 3 + ((pi + k) % 3); // 3~5
        insertReview.run(rvProducts[pi], uid, rating, pick(RV_BODY, pi + k));
        made += 1;
      }
    }
  }
}

// 5.5 Seed Product Likes (if missing)
const likeCount = db.prepare('SELECT COUNT(*) AS count FROM product_likes').get().count;
if (likeCount === 0) {
  const insertLike = db.prepare('INSERT OR IGNORE INTO product_likes (user_id, product_id) VALUES (?, ?)');
  const user1Id = db.prepare("SELECT id FROM users WHERE username = 'user1'").get()?.id;
  const user2Id = db.prepare("SELECT id FROM users WHERE username = 'user2'").get()?.id;
  const user3Id = db.prepare("SELECT id FROM users WHERE username = 'user3'").get()?.id;
  if (user1Id && user2Id && user3Id) {
    const likes = [
      [user1Id, 1], [user1Id, 5], [user1Id, 9],
      [user2Id, 1], [user2Id, 10], [user2Id, 15],
      [user3Id, 1], [user3Id, 5],
    ];
    for (const [uid, pid] of likes) insertLike.run(uid, pid);

    // 대량 더미 좋아요 생성(상품 × 사용자 순환, UNIQUE는 OR IGNORE로 처리)
    const lkUsers = db.prepare("SELECT id FROM users WHERE role = 'user' ORDER BY id").all().map((r) => r.id);
    const lkProducts = db.prepare('SELECT id FROM products ORDER BY id').all().map((r) => r.id);
    let lmade = 0;
    for (let pi = 0; pi < lkProducts.length && lmade < 90; pi += 1) {
      const likesPerProduct = 1 + (pi % 3); // 상품당 1~3명
      for (let k = 0; k < likesPerProduct && lmade < 90; k += 1) {
        insertLike.run(pick(lkUsers, pi * 3 + k), lkProducts[pi]);
        lmade += 1;
      }
    }
  }
}

// 6. Seed Orders and Order Items (if missing)
const orderCount = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
if (orderCount === 0) {
  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, status, total_amount, webhook_url, toss_order_id, toss_payment_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, option_value)
    VALUES (?, ?, ?, ?, ?)
  `);

  const user1Id = db.prepare("SELECT id FROM users WHERE username = 'user1'").get()?.id;
  const user2Id = db.prepare("SELECT id FROM users WHERE username = 'user2'").get()?.id;
  const user3Id = db.prepare("SELECT id FROM users WHERE username = 'user3'").get()?.id;

  if (user1Id && user2Id && user3Id) {
    // Order 1 (user1) - Paid  (티셔츠 + 옥스포드 셔츠)
    const o1 = insertOrder.run(user1Id, 'paid', 58000, null, 'toss_seed_order_1', 'toss_seed_payment_key_1');
    insertOrderItem.run(o1.lastInsertRowid, 1, 1, 19000, 'M');
    insertOrderItem.run(o1.lastInsertRowid, 2, 1, 39000, 'L');

    // Order 2 (user2) - Paid  (와이드 슬랙스)
    const o2 = insertOrder.run(user2Id, 'paid', 49000, null, 'toss_seed_order_2', 'toss_seed_payment_key_2');
    insertOrderItem.run(o2.lastInsertRowid, 5, 1, 49000, 'M');

    // Order 3 (user3) - Pending  (캔버스 토트백 + 코튼 볼캡)
    const o3 = insertOrder.run(user3Id, 'pending', 54000, null, 'toss_seed_order_3', null);
    insertOrderItem.run(o3.lastInsertRowid, 9, 1, 29000, 'Ivory');
    insertOrderItem.run(o3.lastInsertRowid, 12, 1, 25000, 'Free');

    // Order 4 (user1) - Paid  (실버 체인 목걸이)
    const o4 = insertOrder.run(user1Id, 'paid', 35000, null, 'toss_seed_order_4', 'toss_seed_payment_key_4');
    insertOrderItem.run(o4.lastInsertRowid, 15, 1, 35000, 'Silver');

    // 대량 더미 주문 생성(사용자 × 상품 순환, 상태 혼합)
    const odUsers = db.prepare("SELECT id FROM users WHERE role = 'user' ORDER BY id").all().map((r) => r.id);
    const odProducts = db.prepare('SELECT id, price, option_values FROM products ORDER BY id').all();
    for (let n = 5; n <= 60; n += 1) {
      const uid = pick(odUsers, n);
      const status = n % 4 === 0 ? 'pending' : 'paid';
      const lineCount = 1 + (n % 2); // 1~2개 품목
      const items = [];
      let total = 0;
      for (let k = 0; k < lineCount; k += 1) {
        const p = pick(odProducts, n * 2 + k);
        const qty = 1 + (n % 2);
        const opt = (p.option_values || '').split(',')[0] || null;
        items.push([p.id, qty, p.price, opt]);
        total += p.price * qty;
      }
      const paymentKey = status === 'paid' ? `toss_seed_payment_key_${n}` : null;
      const o = insertOrder.run(uid, status, total, null, `toss_seed_order_${n}`, paymentKey);
      for (const [pid, qty, price, opt] of items) {
        insertOrderItem.run(o.lastInsertRowid, pid, qty, price, opt);
      }
    }
  }
}

// 7. Seed Login Logs (if missing) — 대량 더미 접속 로그
const loginLogCount = db.prepare('SELECT COUNT(*) AS count FROM login_logs').get().count;
if (loginLogCount === 0) {
  const insertLog = db.prepare(
    "INSERT INTO login_logs (user_id, username, ip, user_agent, success, at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))"
  );
  const logUsers = db.prepare('SELECT id, username FROM users ORDER BY id').all();
  const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36',
  ];
  for (let n = 0; n < 80 && logUsers.length; n += 1) {
    const u = pick(logUsers, n);
    const success = n % 5 === 0 ? 0 : 1; // 5건 중 1건 실패
    const ip = `203.0.${n % 256}.${(n * 7) % 256}`;
    insertLog.run(u.id, u.username, ip, pick(UAS, n), success, `-${n * 3} hours`);
  }
}

// 8. Seed referral codes for every user missing one (deterministic: REF<USERNAME>)
const usersMissingCode = db.prepare('SELECT id, username FROM users WHERE referral_code IS NULL').all();
if (usersMissingCode.length) {
  const setCode = db.prepare('UPDATE users SET referral_code = ? WHERE id = ?');
  for (const u of usersMissingCode) {
    setCode.run(`REF${u.username.toUpperCase()}`, u.id);
  }
}

// 9. Seed a starter point balance + ledger for demo users (if no transactions yet)
const ptxCount = db.prepare('SELECT COUNT(*) AS count FROM point_transactions').get().count;
if (ptxCount === 0) {
  const insertPtx = db.prepare('INSERT INTO point_transactions (user_id, amount, reason) VALUES (?, ?, ?)');
  const setPoints = db.prepare('UPDATE users SET points = ? WHERE id = ?');
  for (const uname of ['user1', 'user2', 'user3']) {
    const u = db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
    if (u) {
      insertPtx.run(u.id, 3000, '가입 축하 적립');
      setPoints.run(3000, u.id);
    }
  }
}

module.exports = db;
