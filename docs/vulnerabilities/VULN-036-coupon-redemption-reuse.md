# VULN-036 쿠폰 사용(redemption) 재사용

- 대상 스택: node-express, java-spring
- 심각도: Medium
- 분류: A04:2021 Insecure Design (CWE-841 Improper Enforcement of Behavioral Workflow)

## 위치

주문 생성 시 쿠폰 적용 로직은 소유권(`user_coupons`)·`active`·`expires_at`·`min_order_amount`를
검증하고 할인액도 서버가 계산한다 — 그러나 **`user_coupons.used` 를 확인하지 않는다.** 사용 마킹은
검증 없이 `SET used = 1`만 한다(`WHERE used = 0` 가드 없음). 따라서 이미 사용한 쿠폰을 계속 낼 수 있다.

- node: `apps/node-express/src/routes/orders.js` — `findUserCoupon()` + `computeCouponDiscount()`는
  `used`를 보지 않고, `POST /`의 쿠폰 블록이 `UPDATE user_coupons SET used = 1 WHERE id = ?`만 실행.
- java: `.../controller/OrderController.java` — `applyCoupon()`이 `isUsed()`로 거부하지 않고,
  `usedCoupon.setUsed(true); userCouponRepository.save(...)`.

## 트리거 방법

```
# WELCOME5000 쿠폰을 1회 발급받는다 (시드에 user1 소유로 이미 존재)
POST /api/{stack}/coupons/{id}/claim

# 같은 쿠폰 코드로 주문을 반복 생성
for i in 1 2 3; do
  curl -s -b cookies.txt -X POST /api/{stack}/orders -H 'Content-Type: application/json' \
    -d '{"items":[{"productId":2,"quantity":1}],"couponCode":"WELCOME5000"}'
done
→ 매 응답 "discountAmount": 5000 — 쿠폰 1장이 주문 3건(그 이상도)에 할인 적용됨
```

## 영향

- 1회용 쿠폰이 무제한 재사용된다. 정액 5,000원 쿠폰이면 주문마다 5,000원씩 손실.
- `%` 쿠폰이면 손실 폭이 주문 금액에 비례해 커진다.
- 동시 요청(VULN-035 계열)과 결합하면 마킹 자체가 무의미해져 방어 로직을 추가해도 우회 가능.
- VULN-029(claim 중복 발급)와 구분: 029는 *발급* 단계에 한도가 없는 것, 036은 *사용* 단계에서
  1회성이 강제되지 않는 것. 발급을 1장으로 제한해도 036은 그대로 남는다.

## 증거 (재현 확인)

2026-09-01, 클린 재시드 후 로컬 재현(양 스택 동일): `WELCOME5000` 1장으로 주문 3건 생성,
매 응답 `discountAmount: 5000`.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 사용 마킹을 **원자적**으로 한다 —
`UPDATE user_coupons SET used = 1 WHERE id = ? AND used = 0` 후 `changes === 0`이면 "이미 사용한 쿠폰"으로 거부.
java는 검증과 마킹을 같은 트랜잭션에 묶고 `used` 컬럼에 조건부 update 또는 `@Version` 낙관적 잠금.
쿠폰을 주문에 연결(`orders.coupon_id`)해 감사·환불 시 원복 경로도 명확히 한다.

관련: [[VULN-029-coupon-claim-no-dedup]], [[VULN-030-point-balance-manipulation]], [[VULN-035-stock-decrement-race]]
