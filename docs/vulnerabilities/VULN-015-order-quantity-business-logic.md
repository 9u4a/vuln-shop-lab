# VULN-015 주문 수량 음수/0 → 결제액 조작

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A06:2025 Insecure Design (CWE-841 Improper Enforcement of Behavioral Workflow)

## 위치

- `apps/node-express/src/routes/orders.js`, `POST /api/orders` — 주문 항목 검증에서 `quantity < 1` 체크를 제거. `Number.isInteger(quantity)` 만 확인하므로 음수·0 수량 허용.
- `apps/java-spring/.../controller/OrderController.java`, `create()` — `if (product == null || quantity < 1)` → `if (product == null)`.

서버가 `total = Σ(unit_price × quantity)` 를 직접 계산하지만, 음수 수량이 섞이면 합계가 임의로 낮아지거나 음수가 된다. 결제 확인(`POST /api/orders/:id/confirm`)은 `amount === total_amount` 만 비교하므로 조작된 합계 그대로 통과.

## 트리거 방법

```
POST /api/{node,java}/orders
{"items":[
  {"productId": 3, "quantity": 1},      // 고가 상품 (예: 349,000)
  {"productId": 1, "quantity": -8}       // 저가 상품 음수로 상계
]}
```

응답 `amount` 가 1 이하 또는 음수. 이어서 `POST /api/{node,java}/orders/:id/confirm` 에 그 값을 그대로 전달.

## 영향

- 고가 상품을 1원 또는 사실상 무료로 결제 확정.
- `order_items` 에 음수 수량 레코드가 남아 재고/정산 로직 전반 신뢰 붕괴.

## 증거 (재현 확인)

2026-09-01, 로컬 재현 확인(`:8090`, `user1`): `POST /api/node/orders`에 양수+음수 수량 혼합
(`[{productId:1,quantity:5},{productId:2,quantity:-5}]`) → 응답 `amount=-100000`(결제 예상금액 음수).
음수/0 수량 검증이 없어 결제액을 임의로 낮추거나 음수로 만들 수 있음.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현은 각 항목 `quantity >= 1` (정수) 강제 + 주문 합계 하한 검증.
