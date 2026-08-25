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
      (name, description, price, image_url, category, brand, sku, stock, option_name, option_values)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const seed = [
    ['기계식 키보드', '핫스왑을 지원하며 RGB 백라이트가 장착된 고급형 기계식 키보드입니다. 기계식 스위치의 찰진 손맛과 알루미늄 프레임의 견고함을 느껴보세요.', 89000, seedImage('keyboard.png'), 'accessories', 'Vulnlab', 'KEY-001', 42, '스위치', 'Red,Blue,Brown'],
    ['무선 마우스', '인체공학적 비대칭 마우스로 장시간 사용에도 손목 피로가 거의 없습니다. 정밀한 광학 센서와 무소음 클릭으로 어디서나 자유롭게 활용하세요.', 29000, seedImage('mouse.png'), 'accessories', 'Vulnlab', 'MOU-002', 87, '색상', 'Black,White'],
    ['4K UHD 모니터', '27인치 눈부심 방지 4K IPS 모니터입니다. 전문가용 sRGB 100% 색표현 및 HDR 지원으로 게임, 그래픽 편집, 동영상 시청까지 완벽히 소화합니다.', 349000, seedImage('monitor.png'), 'displays', 'Vulnlab', 'MON-003', 15, '스탠드', 'Standard,Adjustable'],
    ['USB-C 멀티허브', '7-in-1 초고속 전송 및 패스스루 충전을 지원하는 USB-C 멀티허브입니다. HDMI 4K 출력 및 SD/TF 카드 리더 탑재로 연결성이 극대화됩니다.', 24000, seedImage('hub.png'), 'accessories', 'Vulnlab', 'HUB-004', 130, '색상', 'Space Gray,Silver'],
    ['스마트 LED 스탠드', '눈이 편안한 플리커프리 무단계 디밍 LED 스탠드입니다. 스마트 터치 센서와 USB 출력 포트로 스마트폰 충전까지 간편하게 처리해 보세요.', 19000, seedImage('lamp.png'), 'office', 'Vulnlab', 'LMP-005', 60, '색상', 'White,Black'],
    ['알루미늄 콤팩트 키보드', '65% 배열의 극단적인 슬림 설계로 책상 위 공간을 혁신적으로 절약해 주는 블루투스 콤팩트 키보드입니다. 고급스러운 통알루미늄 하우징.', 129000, seedImage('keyboard.png'), 'accessories', 'Vulnlab', 'KEY-006', 25, '스위치', 'Linear,Tactile,Clicky'],
    ['버티컬 무선 마우스', '손목 터널 증후군을 예방하기 위한 57도 각도의 프리미엄 버티컬 마우스입니다. 충전식 배터리로 반영구적 사용 가능.', 49000, seedImage('mouse.png'), 'accessories', 'Vulnlab', 'MOU-007', 35, '색상', 'Gray,White'],
    ['포터블 보조 모니터', 'C타입 케이블 하나로 바로 연결되는 15.6인치 초슬림 보조 모니터입니다. 재택근무, 외근, 캠핑지에서 손쉽게 듀얼 스크린 환경을 구축하세요.', 159000, seedImage('monitor.png'), 'displays', 'Vulnlab', 'MON-008', 18, '보호 케이스', 'Basic,Leather'],
    ['PD 100W 질화갈륨 충전기', '차세대 GaN 질화갈륨 소재로 부피는 줄이고 효율은 높인 PD 100W 3포트 고속 충전기입니다. 노트북과 태블릿, 스마트폰을 동시 고속 충전합니다.', 39000, seedImage('hub.png'), 'accessories', 'Vulnlab', 'CHG-009', 150, '색상', 'Black,White'],
    ['모니터 스크린 바 LED', '모니터 위에 거치하여 화면 반사 없이 책상 위만 밝혀주는 비대칭 광학 디자인 스크린바입니다. 눈부심을 차단하여 야간 작업에 최적입니다.', 34000, seedImage('lamp.png'), 'office', 'Vulnlab', 'LMP-010', 75, '작동 모드', 'Manual,Auto Sensor']
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

// 5. Seed Reviews (if missing)
const reviewCount = db.prepare('SELECT COUNT(*) AS count FROM reviews').get().count;
if (reviewCount === 0) {
  const insertReview = db.prepare('INSERT INTO reviews (product_id, user_id, rating, body) VALUES (?, ?, ?, ?)');
  const user1Id = db.prepare("SELECT id FROM users WHERE username = 'user1'").get()?.id;
  const user2Id = db.prepare("SELECT id FROM users WHERE username = 'user2'").get()?.id;
  const user3Id = db.prepare("SELECT id FROM users WHERE username = 'user3'").get()?.id;
  
  if (user1Id && user2Id && user3Id) {
    const reviews = [
      [1, user1Id, 5, "사무실에서 쓸 용도로 갈축을 구매했습니다. 키감이 너무 서걱거리지도 않고 정숙하면서도 치는 맛이 아주 쫄깃하네요. 키캡 품질도 훌륭합니다!"],
      [1, user2Id, 4, "디자인이 심플하고 레트로한 감성이 마음에 드네요. 블루투스 페어링도 끊김없이 잘 됩니다. 다만 높이 조절 단계가 하나만 더 있었으면 완벽했을 것 같아요."],
      [2, user3Id, 5, "마우스가 매우 가벼우며 충전이 정말 오래 갑니다. 하루종일 캐드 작업하는데 손목 통증이 많이 줄어들어서 아주 대만족스럽게 쓰고 있어요."],
      [3, user1Id, 5, "4K 화질 선명도가 놀랍네요. 윈도우랑 맥OS 둘 다 가독성 훌륭하게 뽑아줍니다. 눈부심 방지도 잘 처리되어서 눈 피로도가 대폭 줄었습니다."],
      [3, user2Id, 3, "디스플레이 자체의 색감과 해상도는 넘사벽 수준으로 좋습니다만, 번들 스탠드가 높낮이 조절이 힘들어 별도의 모니터암을 구매해서 거치했습니다."],
      [4, user3Id, 4, "C타입 연결선 일체형이라 간편합니다. USB 3.0 포트 인식 잘 되고 HDMI 포트로 외부 모니터 송출 시 화질 저하가 없습니다. 풀 장착 시 발열은 살짝 있는 편입니다."],
      [5, user2Id, 5, "독서할 때 밤에 방 불 끄고 이 스탠드 하나만 켜두어도 눈이 전혀 안 피로합니다. 타이머 기능이 있어서 켜두고 잠들기에도 제격이네요. 디자인도 고급스러워요."],
      [6, user1Id, 5, "알루미늄 하우징 무게감이 주는 타건 안정감이 엄청납니다. 통울림이 거의 느껴지지 않아 키보드 매니아라면 충분히 돈값하는 끝판왕 모델이라고 생각합니다."],
      [7, user3Id, 5, "사무직의 필수품입니다. 처음 쓸 때는 각도가 어색해서 조금 버벅거렸는데, 이틀 정도 적응하고 나니 기존 일반 마우스는 어색해서 다시 못 쓰겠습니다."]
    ];
    for (const row of reviews) insertReview.run(...row);
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
    // Order 1 (user1) - Paid
    const o1 = insertOrder.run(user1Id, 'paid', 118000, null, 'toss_seed_order_1', 'toss_seed_payment_key_1');
    insertOrderItem.run(o1.lastInsertRowid, 1, 1, 89000, 'Brown');
    insertOrderItem.run(o1.lastInsertRowid, 2, 1, 29000, 'Black');

    // Order 2 (user2) - Paid
    const o2 = insertOrder.run(user2Id, 'paid', 349000, null, 'toss_seed_order_2', 'toss_seed_payment_key_2');
    insertOrderItem.run(o2.lastInsertRowid, 3, 1, 349000, 'Adjustable');

    // Order 3 (user3) - Pending
    const o3 = insertOrder.run(user3Id, 'pending', 43000, null, 'toss_seed_order_3', null);
    insertOrderItem.run(o3.lastInsertRowid, 5, 1, 19000, 'White');
    insertOrderItem.run(o3.lastInsertRowid, 4, 1, 24000, 'Space Gray');

    // Order 4 (user1) - Paid
    const o4 = insertOrder.run(user1Id, 'paid', 39000, null, 'toss_seed_order_4', 'toss_seed_payment_key_4');
    insertOrderItem.run(o4.lastInsertRowid, 9, 1, 39000, 'Black');
  }
}

module.exports = db;
