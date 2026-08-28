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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
`);

for (const stmt of [
  'ALTER TABLE users ADD COLUMN bio TEXT',
  'ALTER TABLE users ADD COLUMN avatar_url TEXT',
  'ALTER TABLE users ADD COLUMN name TEXT',
  'ALTER TABLE users ADD COLUMN phone TEXT',
  'ALTER TABLE users ADD COLUMN postcode TEXT',
  'ALTER TABLE users ADD COLUMN address TEXT',
  'ALTER TABLE users ADD COLUMN address_detail TEXT',
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
        role = ?, name = ?, phone = ?, bio = ?, postcode = ?, address = ?, address_detail = ?
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
  for (const row of faqs) insertFaq.run(...row);
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
      null,
      null,
    ],
    [
      '신규 회원 웰컴 쿠폰',
      '<p>지금 가입하면 <strong>첫 구매 5,000원 즉시 할인</strong> 쿠폰을 드려요.</p><p>가입 후 마이페이지에서 바로 확인하실 수 있습니다.</p>',
      null,
      '/signup',
      1,
      null,
      null,
    ],
    [
      '무료배송 위크',
      '<p>이번 주 모든 주문 <strong>무료배송</strong> — 별도 쿠폰 없이 자동 적용됩니다.</p>',
      null,
      '/products',
      1,
      null,
      null,
    ],
  ];
  for (const row of events) insertEvent.run(...row);
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
  }
}

module.exports = db;
