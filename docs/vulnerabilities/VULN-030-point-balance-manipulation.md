# VULN-030 포인트 사용 미검증 → 결제액/잔액 조작

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A06:2025 Insecure Design (Business Logic, CWE-840 Business Logic Errors / CWE-20 Improper Input Validation)

## 위치

주문 생성 시 클라이언트가 보낸 `pointsUsed`를 **보유 잔액·부호 검증 없이** 그대로 상품금액에서
차감해 `total_amount`(결제 예상금액)를 만든다. 잔액 차감(`points = points - pointsUsed`)은 결제 확인
시점으로 미뤄졌지만 **여기서도 잔액·부호 검증이 없다** — 검증 부재라는 결함은 그대로다.

- node: `apps/node-express/src/routes/orders.js`, `POST /api/orders` —
  `total = itemsTotal - discount - Number(pointsUsed)` 후 그대로 `total_amount`에 저장(음수 허용).
  잔액 차감은 `POST /api/orders/:id/confirm`에서 `points = points - pointsUsed`(검증 없음).
- java: `apps/java-spring/.../controller/OrderController.java` —
  `create`가 `total = itemsTotal.subtract(pointsUsed)`로 저장, `confirm`이
  `dbUser.setPoints(dbUser.getPoints() - pointsUsed)`(검증 없음).

## 트리거 방법

```
POST /api/orders  (로그인 필요)
{"items":[{"productId":1,"quantity":1}], "pointsUsed": 999999}
→ 보유 포인트가 0~3000뿐이어도 total_amount가 음수(-980999)로 생성됨.
  음수 pointsUsed를 보내면 반대로 결제액을 부풀릴 수도 있음.
  실제 잔액 차감은 결제 확인(POST /api/orders/:id/confirm)이 성공해야 반영되며,
  이때도 잔액·부호 검증이 없어 잔액이 음수/과다로 조작된다.
```

## 영향

- 실제 보유량을 초과하거나 음수인 포인트로 결제 예상금액을 0/음수로 만들어 사실상 무료 결제,
  또는 잔액을 임의로 조작(음수/과다) 가능.

## 증거 (재현 확인)

2026-08-31, 클린 재시드 후 로컬 재현(양 스택 동일): user1(보유 3000P)으로 `pointsUsed=999999`
주문 생성 시 응답 `amount=-980999`(node)/`amount=-980999.00`(java), 이후 `GET /api/points` 잔액 음수 확인.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `pointsUsed`를 서버에서 `0 <= pointsUsed <= 현재 잔액 && pointsUsed <= itemsTotal`로 검증,
음수 거부, 잔액 차감은 트랜잭션 내 조건부(UPDATE ... WHERE points >= ?)로 처리. 관련: [[VULN-015-order-quantity-business-logic]]
(주문 수량 음수 조작)과 동일 계열의 결제액 조작 표면.
