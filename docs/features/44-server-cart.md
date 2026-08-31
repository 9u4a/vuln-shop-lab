# 44. 서버 장바구니 + 체크아웃 재고 차감

브랜치: `feature/order-lifecycle-batch` · 관련 취약점: [VULN-035](../vulnerabilities/VULN-035-stock-decrement-race.md)

## 무엇을 만들었나

- `carts`(회원당 1개) / `cart_items` 테이블. 신규 API `/api/cart`(GET), `/api/cart/items`(POST),
  `/api/cart/items/:id`(PUT/DELETE), `/api/cart`(DELETE). 로그인 필요.
- `CartContext.jsx`를 **하이브리드**로 전환: 로그인 시 서버 장바구니, 비로그인 시 localStorage,
  로그인 시점에 localStorage 라인을 서버로 1회 병합. 기존 공개 API
  (`items/total/addItem/setQuantity/changeOption/removeItem/clear`) 형태 유지 →
  `ProductCard`/`SiteHeader`/`ProductDetail`/`CheckoutResult`는 무변경.
- `POST /api/orders`가 이제 **`products.stock`을 차감**한다(기존엔 재고가 표시 전용이었음). 주문 성공 시
  서버 장바구니를 비운다.
- node `routes/cart.js`(신규) / java `CartController`(신규, 기존 `vuln/CartImportController`와 서브경로만 다름).

## 설계 판단

- 장바구니가 클라이언트 전용이면 결제 검증·재고·쿠폰 사용을 서버가 신뢰할 수 없다. 서버 장바구니로
  옮기면서 **재고 차감을 주문 생성에 편입** — 여기서 원자성을 확보하지 않아 VULN-035(경쟁조건)가 생긴다.
- `cart_items`에 `unit_price`를 **저장하지 않는다**. 체크아웃이 항상 `products.price`를 재조회하므로
  장바구니를 통한 가격 조작(2차 취약점)이 생기지 않는다 — 1기능=1취약점 유지.
- 하이브리드로 둔 이유: 비회원도 담기는 가능해야 실제 커머스답고, 로그인 병합으로 담아둔 걸 잃지 않는다.
- 재고 차감 메커니즘은 스택별로 다르다(node는 Mongo 활동 기록 `await`가 이벤트 루프 yield를 만들고,
  java는 스레드-per-요청이 자연히 인터리브) — CLAUDE.md의 "구현 상이 허용"에 따른다.

## 이후 변경

- VULN-035를 의도적으로 남김: 재고 차감이 check→act 비원자 → 마지막 재고 동시 주문 시 초과판매.
