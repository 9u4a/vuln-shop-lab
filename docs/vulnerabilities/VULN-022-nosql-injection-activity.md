# VULN-022 Mongo 기반 활동 피드 NoSQL 인젝션

- 대상 스택: node-express (MongoDB)
- 심각도: High
- 분류: A05:2025 Injection (NoSQL Injection, CWE-943)

## 위치

- `docker-compose.yml` — 신규 `mongo` 서비스(`mongo:7`), Node 는 `MONGO_URL=mongodb://mongo:27017`.
- `apps/node-express/src/mongo.js` — `vulnshop.activity` 컬렉션 연결 + 사용자별 활동 문서 시드.
- `apps/node-express/src/routes/activity.js`, `GET /api/activity` — 쿼리스트링 `username` 을 검증·형변환 없이 `collection.find({ username })` 에 그대로 전달. Express 의 `express.urlencoded({ extended: true })`(qs) 파싱으로 `?username[$ne]=x` 가 `{ username: { $ne: 'x' } }` 객체가 되어 그대로 필터가 됨. `requireAuth` 는 있으나 소유권 검사 없음("내 활동" 이라면서 `username` 을 클라이언트가 지정).

`apps/node-express` 의 다른 데이터는 전부 `node:sqlite`(관계형)라 이 클래스는 이 전용 Mongo 기능에만 존재한다.

## 트리거 방법

```
GET /api/node/activity?username[$ne]=___     → 모든 사용자의 활동 문서 반환
GET /api/node/activity?username[$regex]=^user   → user* 계정만
```

(정상 요청은 `GET /api/node/activity` → 세션 사용자 본인 활동만)

## 영향

- 인증된 임의 사용자가 다른 사용자(관리자 포함)의 활동 로그 열람: 로그인 시각, 검색어, 주문 ID(`order.create` detail), 리뷰 작성 이력 등.
- 연산자 주입으로 불리언/정규식 기반 블라인드 추출 가능.

## 증거 (재현 확인)

(진단 단계에서 채움) `user3` 세션으로 `GET /api/node/activity?username[$ne]=zzz` → `9u4a`(관리자 콘솔 접속), `admin`(상품 재고 조정), `user1`/`user2` 의 활동 문서가 응답에 포함.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `username` 을 무시하고 세션 사용자로 고정, 또는 `String(req.query.username)` 강제 형변환 + 스키마 검증(`$` 로 시작하는 키 거부).
