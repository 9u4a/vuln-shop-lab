# VULN-035 재고 차감 경쟁조건 (TOCTOU)

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A04:2021 Insecure Design (CWE-362 Concurrent Execution using Shared Resource, CWE-367 TOCTOU)

## 위치

주문 생성(`POST /api/orders`)이 상품 재고를 **읽고(check) → 감산해서 저장(act)** 하는데, 그 사이에
원자적 가드가 없다. 조건부 UPDATE(`... WHERE stock >= qty`)도, 트랜잭션·행 잠금도 없어 동시 요청이
같은 재고 값을 읽고 각자 감산한다.

- node: `apps/node-express/src/routes/orders.js`, `POST /` — `SELECT stock`(동기) → `await insertActivity(...)`
  (Mongo에 `order.create` 활동 기록, 이벤트 루프 yield 발생) → `UPDATE products SET stock = ? WHERE id = ?`.
  동기 `node:sqlite`라도 중간의 `await`가 다른 요청에 제어를 넘겨 인터리브가 발생한다.
- java: `.../controller/OrderController.java`, `create` — `productRepository.findById(id).getStock()` →
  `p.setStock(current - qty); productRepository.save(p)`. `@Transactional` 없음 + 스레드-per-요청 →
  두 스레드가 같은 값을 읽고 각자 저장.

## 트리거 방법

```
# 관리자가 상품 재고를 1로 맞춘다
PUT /api/{stack}/admin/products/3   {"stock": 1}

# 마지막 1개에 대해 동시 체크아웃 20건을 던진다
seq 20 | xargs -P20 -I{} curl -s -b cookies.txt -X POST /api/{stack}/orders \
  -H 'Content-Type: application/json' -d '{"items":[{"productId":3,"quantity":1}]}'

GET /api/{stack}/products/3
→ stock 이 음수(예: -10 ~ -19), 1개짜리 상품에 대해 주문이 여러 건 생성됨(초과판매).
```

## 영향

- 재고 1개 상품이 다수에게 팔린다 — 물류상 이행 불가 주문, 환불·CS 비용, 재고 정합성 붕괴.
- 한정 수량 프로모션·선착순 상품에서 악용해 정상 구매자 몫을 가로챌 수 있다.
- 재고가 음수로 내려가면 `inStock` 필터·품절 표시 등 후속 로직도 오작동한다.
- 같은 계열로 VULN-036(쿠폰)·VULN-030(포인트)도 동시성 하에서 잔액/한도 우회가 가능해진다 —
  035는 그 중 재고에 대한 대표 사례이자 저장소 최초의 명시적 동시성 취약점.

## 증거 (재현 확인)

2026-09-01, 클린 재시드 후 로컬 재현(양 스택):
```
node: stock 1 → -10  (20건 동시 요청 중 11건 성공)
java: stock 1 → -19  (20건 동시 요청 대부분 성공)
```

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 재고 차감을 **원자적 조건부 UPDATE**로 한다 —
`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?` 후 `changes === 0`이면 품절 처리.
java는 `@Transactional` + 비관적 잠금(`SELECT ... FOR UPDATE` / `@Lock(PESSIMISTIC_WRITE)`) 또는
낙관적 잠금(`@Version`)으로 감산을 직렬화. 재고를 별도 예약(reservation) 테이블로 분리하는 설계도 가능.

관련: [[VULN-030-point-balance-manipulation]], [[VULN-036-coupon-redemption-reuse]], [[VULN-015-order-quantity-business-logic]]
