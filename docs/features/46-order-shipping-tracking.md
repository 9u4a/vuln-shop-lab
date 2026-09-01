# 46. 주문 배송지 + 배송 조회

브랜치: `feature/order-lifecycle-batch` · 관련 취약점: [VULN-037](../vulnerabilities/VULN-037-shipment-tracking-idor.md)

## 무엇을 만들었나

- 주문에 배송지 스냅샷 컬럼 추가(`orders.ship_name/ship_phone/ship_postcode/ship_address/ship_address_detail`).
  체크아웃 시 요청의 `shipping` override, 없으면 프로필 주소를 복사해 주문에 고정한다.
- `shipments` 테이블(택배사·송장번호·상태). 관리자가 주문 상세에서 택배사를 지정하면
  **순차 송장번호**(`1000000000 + shipment.id`)가 발번된다.
- 신규 API: 관리자 `PUT /api/admin/orders/:id/shipment`, 공개 `GET /api/shipments/track?no=<송장번호>`
  (비회원 배송조회 — 세션 불필요).
- 신규 클라이언트 페이지 `TrackShipment.jsx`(`/track`, 상단 메뉴·푸터에 "배송조회" 링크),
  `OrderDetail`·관리자 주문 상세에 배송 상태/송장/배송지 표시. `StatusChip`에 `preparing` 라벨 추가.

## 설계 판단

- 실제 커머스의 "비회원 배송조회"를 그대로 구현 — 송장번호만 알면 조회 가능. 여기서 두 가지를 잘못했다:
  ① 송장번호를 순차 발번, ② 조회 응답에 배송지 PII를 그대로 포함. 이 둘의 조합이 VULN-037.
- 배송지는 주문 시점 **스냅샷**으로 고정한다(프로필 주소가 나중에 바뀌어도 주문 배송지는 유지) —
  이게 조회 응답이 오래된 PII까지 담게 되는 이유이기도 하다.
- 송장 발번을 관리자만 하도록 게이트했지만, *조회*는 무인증이라 접근제어가 무의미하다.

## 이후 변경

- VULN-037을 의도적으로 남김: 순차 송장번호 + 무인증 조회 → 전 구매자 배송 PII 열거.
