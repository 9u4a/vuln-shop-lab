# 20. 취약점 배치: VULN-015 주문 수량 비즈니스 로직

브랜치: `feature/vuln-batch-015-business-logic` · 관련 취약점: VULN-015

## VULN-015 — 음수/0 수량 → 결제액 조작
- node `orders.js` `POST /` — 항목 검증 루프에서 `quantity < 1` 가드 제거(`Number.isInteger`는 유지). java `OrderController.create()` — `quantity < 1` 조건 제거.
- 서버는 `total = Σ(price × qty)`를 그대로 계산하고 `confirm()`은 `amount === total`만 확인하므로, 음수 수량 항목으로 합계를 ≤1/음수로 낮춰도 승인된다. 클라 변경 없음(장바구니 UI는 음수를 보내지 않음 — Burp Repeater로 재현하는 API 레벨 결함).
