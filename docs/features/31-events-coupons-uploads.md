# Events page · Coupons · Image uploads · Nav cleanup

Branch: `feature/events-coupons-uploads` (base: `feature/admin-access-logs`)

사용자 요청 후속 배치: 사용자용 이벤트 메뉴/페이지, 쿠폰 기능(발급·내 쿠폰함·관리자 관리),
공지/이벤트 이미지를 URL 대신 파일 업로드로, 2단 메뉴 바를 한 줄로 정리, Java `9u4a` 계정
견고화.

## Java `9u4a` 계정 견고화 (버그 수정)

Phase 5에서 추가한 `users.active`(및 `reviews.secret`) NOT NULL 컬럼에 DB 기본값이 없어,
**기존 `java_data` 볼륨**에서 `ddl-auto: update`가 컬럼을 추가하지 못하고 기동/시딩이 실패 →
`9u4a` 등 시드 계정이 생성되지 않는 문제. `@ColumnDefault("true"/"false")`를 부여해 기존
테이블에도 안전하게 컬럼이 추가되도록 수정(`entity/User.java`, `entity/Review.java`).
(신규 볼륨/`down -v` 재시드에서는 원래도 정상 생성됨.)

## 메뉴 바 한 줄 구성

헤더의 2단(메인 메뉴 + 별도 카테고리 바)을 한 줄로 통합. `navLinks.js`를 `NAV_LINKS`(이벤트/쿠폰/
공지/FAQ)와 `ACCOUNT_LINKS`(주문내역/관리자)로 분리. `SiteHeader`는 `전체 + 카테고리 5개 | 이벤트
쿠폰 공지 FAQ`를 한 `.site-nav`에 렌더(가로 스크롤), 주문내역/관리자는 상단 유틸 바로 이동.
모바일 드로어에도 동일 구성. 기존 `.category-nav` 제거.

## 공지/이벤트 이미지 파일 업로드

- 데이터: `notices.image_url` 컬럼 추가(node `db.js` + guarded ALTER, java `Notice.imageUrl`).
  이벤트는 기존 `image_url` 재사용.
- 공용 업로드 엔드포인트 `POST /api/admin/upload`(requireAdmin) 추가 — 파일을 올리고 `filename`
  반환(node `routes/admin.js`, java `AdminController`). 기존 이미지 업로드 헬퍼 재사용.
- 클라이언트 `components/AdminImageField.jsx` 신규(미리보기 + 업로드/변경/제거) — `AdminEvents`의
  이미지 URL 입력과 `AdminNotices` 폼에서 사용. 공지 목록(`Notices.jsx`)·이벤트 페이지에 이미지 표시.

## 사용자 이벤트 메뉴 + 페이지

`pages/Events.jsx` 신규 — `GET /api/events`(활성 이벤트) 카드 목록(이미지·본문·CTA). 라우트
`/events` + 상단 메뉴 "이벤트". (이벤트 본문은 팝업과 동일하게 HTML 렌더 — VULN-023 표면 확장.)

## 쿠폰 기능

- 데이터: `coupons`(code/title/description/discount_type/discount_value/min_order_amount/active/
  expires_at) + `user_coupons`(user_id/coupon_id/used). 양 스택 + 더미 3건 시드
  (WELCOME5000, SUMMER10, FREESHIP3000).
- 엔드포인트(양 스택): `GET /api/coupons`(활성+미만료, 로그인 시 claimed 포함),
  `GET /api/coupons/mine`, `POST /api/coupons/:id/claim`, 관리자 `GET /coupons/manage` + CRUD.
  node `routes/coupons.js`, java `Coupon`/`UserCoupon` 엔티티+레포+`CouponController`.
- 클라이언트: `pages/Coupons.jsx`(발급 가능 쿠폰 + 내 쿠폰함, 받기) `/coupons` + 메뉴 "쿠폰",
  `pages/admin/AdminCoupons.jsx` `/admin/coupons` 탭. `api.js` 쿠폰 함수, `index.css` 쿠폰/이벤트/
  이미지필드 스타일.

## 의도된 취약점

- **VULN-029** 쿠폰 claim이 중복/한도 검증 없이 매번 INSERT → 동일 쿠폰 무제한 발급(A04).
- 표면 확장(신규 ID 없음): 공용 업로드가 Content-Type만 신뢰(VULN-018), 이벤트 본문이 `/events`
  페이지에도 HTML 렌더(VULN-023).

## 검증

- node `node -c`, java `docker compose build`, client `npm run build` 무오류.
- 클린 재시드 후 양 스택 **동일 결과**:
  - `9u4a` 로그인 200(양 스택).
  - 쿠폰 3건 목록, `claim` 2회 → 내 쿠폰함 2건(VULN-029 중복 발급).
  - 공용 업로드 → `filename` 반환, 공지 `imageUrl`로 저장·조회(ASCII 본문 기준; 한글은 브라우저
    UTF-8에서 정상, curl CP949는 400).
  - `/admin/upload`로 올린 `.html`이 `/uploads/*`에서 `text/html`로 서빙(VULN-018 확장).
