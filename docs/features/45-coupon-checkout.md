# 45. 쿠폰 결제 적용

브랜치: `feature/order-lifecycle-batch` · 관련 취약점: [VULN-036](../vulnerabilities/VULN-036-coupon-redemption-reuse.md)

## 무엇을 만들었나

- 그동안 쿠폰은 "받기(claim)"만 되고 결제에 쓸 수 없었다(`orders`에 쿠폰 컬럼이 없었음).
  이제 체크아웃에서 쿠폰 코드를 입력해 할인을 적용한다.
- `orders.coupon_id`, `orders.discount_amount` 컬럼 추가. 주문 생성 시 `user_coupons`⋈`coupons`로
  **소유권·active·만료·최소주문금액을 서버에서 검증**하고 할인액을 **서버가 계산**한 뒤 차감,
  `user_coupons.used = 1` 마킹.
- 신규 API `POST /api/coupons/apply-preview`(로그인) — Cart UI가 주문 전 할인액을 미리 보여주기 위한 것.
  실제 사용(redemption) 처리는 `POST /api/orders`에서만 일어난다.
- `Cart.jsx`에 쿠폰 코드 입력 + 할인 미리보기 행, `OrderDetail`·관리자 주문 상세에 할인액 표시.

## 설계 판단

- 기능 자체는 "대체로 정상"으로 만들었다 — 클라이언트가 보낸 `discountAmount`를 신뢰하지 않고,
  소유하지 않은 쿠폰/만료/최소금액 미달을 모두 거부한다.
- **딱 하나 빠뜨린 것**: redemption 경로가 `user_coupons.used`를 확인하지 않는다. 이것이 VULN-036.
  VULN-029(claim 중복 발급)와는 다른 지점 — 발급이 아니라 *사용*이다.
- 미리보기 엔드포인트를 분리해 UI 편의(주문 전 할인 표시)와 실제 사용 처리를 떼어 놓았다.
  취약점은 사용 처리 한 곳(`POST /api/orders`)에만 있다.

## 이후 변경

- VULN-036을 의도적으로 남김: 쿠폰 사용 시 `used` 미확인 → 1장으로 여러 주문 할인.
