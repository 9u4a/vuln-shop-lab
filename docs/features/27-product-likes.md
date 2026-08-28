# Product likes (좋아요/찜 · 위시리스트 · 바로 구매)

Branch: `feature/product-likes` (base: `feature/apparel-catalog`)

상품 찜(좋아요) 기능과 찜한 상품 목록(위시리스트)을 추가한다. 상품 목록/상세에 좋아요 수와
좋아요순 정렬을 노출하고, 상세에는 "바로 구매" 동선을 더한다.

## 데이터 모델 — `product_likes` (양 스택)

`id, user_id, product_id, created_at` + `UNIQUE(user_id, product_id)`.

- node: `apps/node-express/src/db.js` 테이블 + 시드(더미 찜 8건). `routes/likes.js` 신규,
  `server.js`에 `/api/likes` 마운트.
- java: `entity/ProductLike.java` + `repository/ProductLikeRepository.java` +
  `controller/LikeController.java`. `DataSeeder.seedLikes()` 동일 더미.

상품 응답에 `likeCount`(+ 로그인 시 `liked`) 포함 — node는 `products.js`에서 집계/조인,
java는 `Product`의 `@Transient likeCount/liked`를 `ProductController`에서 채운다.

## 엔드포인트 (양 스택)

| 메서드 | 경로 | 접근 | 동작 |
|--------|------|------|------|
| GET | `/api/likes` | requireAuth | 내 위시리스트 (또는 `?userId=` — **VULN-024 IDOR**) |
| POST | `/api/likes/:productId` | requireAuth | 찜 토글 → `{liked, likeCount}` |
| DELETE | `/api/likes/:productId` | requireAuth | 찜 해제 |

`GET /api/products`·`/products/:id`에 `likeCount/liked` 포함, `sort=likes`(좋아요순) 지원
(후기순과 함께 앱 레벨 정렬 — java에서도 SpEL로 평가하지 않음).

## 클라이언트

- `components/LikeButton.jsx` 신규 — 하트 토글 + 카운트, 비로그인 시 토스트 후 로그인 이동,
  `ProductCard`(미디어 우상단)·`ProductDetail`(구매 박스)에서 사용.
- `pages/mypage/MyPageLikes.jsx` 신규 — 찜 목록 그리드. `/mypage/likes` 탭
  (`MyPageLayout` TABS + `App.jsx` 라우트).
- `ProductDetail.jsx` — "장바구니 담기"/"바로 구매" 2버튼 + 찜 버튼.
- `api.js` — `toggleLike`, `fetchWishlist`. `data/categories.js` SORTS에 좋아요순 추가.
- `index.css` — `.like-btn*`, `.product-card__like`, `.buy-box__actions/__like`.

## 의도된 취약점 (VULN-024)

`GET /api/likes`가 `userId` 쿼리 파라미터를 소유권 검증 없이 사용 → 로그인 사용자가 임의
`userId`로 **타인의 위시리스트를 열람(IDOR)**. A01 Broken Access Control.
문서: `docs/vulnerabilities/VULN-024-idor-wishlist-userid.md`.

## 검증

- node `node -c`, java `docker compose build`, client `npm run build` 무오류.
- 클린 재시드 후 양 스택 **동일 결과**:
  - `sort=likes` 상위: 크루넥 티셔츠(3) > 와이드 슬랙스(2) > 캔버스 토트백(1), user1은 `liked=true`.
  - 내 위시리스트 3건 → 상품2 토글 후 4건.
  - IDOR: user1 세션으로 `GET /api/likes?userId=4` → user2 위시리스트 3건 노출.
