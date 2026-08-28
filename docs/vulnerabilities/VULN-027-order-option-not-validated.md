# VULN-027 주문 옵션 값 미검증 (상품 제공 옵션과 대조 없음)

- 대상 스택: node-express, java-spring
- 심각도: Low
- 분류: A04:2021 Insecure Design (Business Logic, CWE-20)

## 위치

주문 생성 시 `optionValue`를 해당 상품이 실제 제공하는 옵션(`option_values`)과 대조하지 않고
클라이언트가 보낸 문자열을 그대로 저장한다. 장바구니 옵션 변경 기능
(`docs/features/29-cart-option-edit.md`)이 옵션 선택을 전면에 내세우면서 드러난 설계 결함.

- node: `apps/node-express/src/routes/orders.js`, `POST /api/orders` — `optionValue`를 검증 없이
  `order_items.option_value`에 저장.
- java: `apps/java-spring/.../controller/OrderController.java`, `create` — 동일
  (`oi.setOptionValue(String.valueOf(item.get("optionValue")))`).

## 트리거 방법

```
POST /api/orders   (로그인 필요)
{"items":[{"productId":1,"quantity":1,"optionValue":"NOT_OFFERED_2XL_hack"}]}

→ 상품1이 제공하지 않는 임의 옵션 문자열이 그대로 주문 항목에 저장됨
```

## 영향

- 재고/SKU가 없는 옵션 주문 생성 → 물류/재고 정합성 오류, 임의 문자열 주입으로 하위 처리
  로직(영수증 생성 등, VULN-010/016/019와 연계 가능) 오염.
- 가격은 상품 기준으로 계산되므로 직접적 금액 조작은 아니나, 제공되지 않는 구성의 주문이
  성립하는 비즈니스 로직 결함.

## 증거 (재현 확인)

2026-08-28, 클린 재시드 후 로컬 재현(양 스택 동일): 상품1(사이즈 S,M,L,XL 제공)에
`optionValue="NOT_OFFERED_2XL_hack"`로 주문 생성 → 주문 상세의 `optionValue`에 그대로 저장됨.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 서버에서 `optionValue`가 해당 상품의 `option_values` 목록에 포함되는지 검증하고,
아니면 400으로 거부. 옵션이 있는 상품은 값 필수화.
