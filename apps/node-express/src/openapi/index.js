// OpenAPI 3.0 명세 — 손으로 작성(라우트 파일 불변). 관리자(/api/admin/**) 엔드포인트는 제외.
// src/routes/ 와 1:1로 대응하는 paths/*.js 모듈을 합쳐 만든다.

const { schemas, securitySchemes, responses } = require('./components');

const pathModules = [
  './paths/session',
  './paths/auth',
  './paths/products',
  './paths/profile',
  './paths/orders',
  './paths/faqs',
  './paths/notices',
  './paths/events',
  './paths/activity',
  './paths/likes',
  './paths/coupons',
  './paths/qna',
  './paths/addresses',
  './paths/points',
  './paths/returns',
  './paths/referral',
  './paths/restock',
  './paths/cart',
  './paths/shipments',
];

const paths = {};
for (const mod of pathModules) {
  Object.assign(paths, require(mod));
}

const tags = [
  { name: '세션' },
  { name: '인증' },
  { name: '상품' },
  { name: '프로필' },
  { name: '주문' },
  { name: 'FAQ' },
  { name: '공지사항' },
  { name: '이벤트' },
  { name: '활동 피드' },
  { name: '좋아요·위시리스트' },
  { name: '쿠폰' },
  { name: 'Q&A 문의' },
  { name: '주소 검색' },
  { name: '포인트' },
  { name: '반품·환불' },
  { name: '추천인' },
  { name: '재입고 알림' },
  { name: '장바구니' },
  { name: '배송' },
];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Vuln Shop API — node-express',
    version: '0.1.0',
    description:
      '의도적으로 취약한 커머스 API. 관리자 엔드포인트(`/api/admin/**`)는 이 명세에서 제외됨.',
  },
  servers: [
    { url: '/api/node', description: 'nginx 진입점 (http://localhost:8090)' },
    { url: 'http://localhost:3000/api', description: 'WAS 직접' },
  ],
  tags,
  paths,
  components: { schemas, securitySchemes, responses },
};
