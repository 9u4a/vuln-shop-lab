# VULN-029 쿠폰 중복 발급 (claim 중복/한도 검증 없음)

- 대상 스택: node-express, java-spring
- 심각도: Low
- 분류: A06:2025 Insecure Design (Business Logic, CWE-770 Missing Limit)

## 위치

쿠폰 발급(claim) 엔드포인트가 "이미 발급받았는지 / 발급 한도"를 검증하지 않아, 같은 사용자가
같은 쿠폰을 무제한으로 발급받을 수 있다.

- node: `apps/node-express/src/routes/coupons.js`, `POST /api/coupons/:id/claim` — 중복 검사 없이
  매 요청마다 `user_coupons`에 INSERT.
- java: `apps/java-spring/.../controller/CouponController.java`, `claim` — 동일
  (`userCouponRepository.save(new UserCoupon(...))`), `user_coupons`에 UNIQUE 제약도 없음.

## 트리거 방법

```
POST /api/coupons/1/claim   (로그인 필요) 를 반복 호출
→ 호출한 만큼 내 쿠폰함(user_coupons)에 동일 쿠폰이 중첩 발급됨
GET /api/coupons/mine 로 수량 확인
```

## 영향

- 웰컴/할인 쿠폰을 무제한 확보 → 할인 남용, 프로모션 예산 왜곡(비즈니스 로직 악용).

## 증거 (재현 확인)

2026-08-28, 클린 재시드 후 로컬 재현(양 스택 동일): user1으로 쿠폰1 claim을 2회 호출 후
`GET /api/coupons/mine`에 동일 쿠폰이 2건 발급되어 있음을 확인.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `user_coupons(user_id, coupon_id)`에 UNIQUE 제약을 두고, claim 시 기존 발급 여부를
확인해 중복이면 409로 거부. 필요하면 쿠폰별 총 발급 수량 한도도 검증.
