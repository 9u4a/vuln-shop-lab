# 02. 장바구니 · 주문 · 결제(Toss 테스트 모드)

브랜치: `feature/cart-orders-payment`

## 무엇을 만들었나
- 장바구니는 클라이언트 전용(`CartContext`, 백엔드별 localStorage) — 결제 전까지 서버 상태 없음.
- `POST /api/orders` — `{items:[{productId,quantity}], webhookUrl?}`. **상품 가격은 항상 서버 값**으로 조회해 합계 계산, `orders`(status=pending)+`order_items` 스냅샷 생성.
- `GET /api/orders`, `GET /api/orders/:id` — 세션 사용자로 스코프(타인 주문은 404).
- `POST /api/orders/:id/confirm` — `TOSS_SECRET_KEY`로 Toss `payments/confirm` 호출, 클라 보고 금액을 주문 합계와 대조 후 승인. 키 미설정 시 501(결제 없이 나머지 흐름 테스트 가능).
- 주문 webhook: `webhookUrl` 지정 시 결제 완료 후 요약을 POST(fire-and-forget, 5초 타임아웃).
- 클라이언트: `/cart`·`/orders`·`/orders/:id`·`/checkout/success|fail`, Toss 호스팅 결제 리다이렉트 연동.

## 설계 판단
- 결제사는 계정 없이 문서의 공유 테스트 키만으로 동작하는 **Toss 테스트 모드** 채택(가상 승인, 실제 청구 없음 — 안전 원칙 부합).

## 이후 변경
- Toss SDK v1 → v2 위젯 방식으로 교체(12). 장바구니의 webhook URL 입력 필드는 제거(12, SSRF는 VULN-004로 API 레벨 유지). USD 예시 가격은 KRW 정수로 전환(13), 상품은 의류로 재시드(26).
- webhook의 SSRF 무방비는 이후 VULN-004로 문서화. `react-router-dom 6.26.2`는 오픈 리다이렉트 CVE 포함 상태로 의도적 고정.
