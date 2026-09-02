# 59. 배송 추적 타임라인

브랜치: `feature/order-cart-admin-refinements` · 관련 취약점: [VULN-037](../vulnerabilities/VULN-037-shipment-tracking-idor.md)(유지)

## 무엇을 만들었나

- 기존 배송(`shipments`)은 단일 `status` 한 값만 보유했다. 실제 택배처럼 **타임스탬프별 이벤트**를 쌓아
  주문 상세·배송 조회·공유 페이지에서 세로 타임라인으로 보여준다.
- 신규 `tracking_events` 테이블/`TrackingEvent` 엔티티(`tracking_no`·`status`·`description`·`location`·
  `occurred_at`). 송장번호로 키. 양 스택.
- 발생: 관리자 `PUT /api/admin/orders/:id/shipment`(상태 등록/변경) 시 이벤트 1건 append. 시드 배송건은
  상태에 맞춰 집화→간선상차→배송출발→배송완료 이벤트를 결정적 타임스탬프로 생성(멱등, 최초 1회).
- 노출: `GET /shipments/track?no=`·`GET /orders/:id`·`/orders/shared/:token` 응답의 `shipment.events[]`.
- 클라이언트 공용 `components/ShipmentTimeline.jsx` — `OrderDetail`·`SharedOrder`·`TrackShipment` 재사용.

## 설계 판단

- 상태 한 값 → 이벤트 로그로 확장하되, 무인증·순차 송장번호 조회(VULN-037)는 그대로 두고 그 위에 이벤트만
  얹었다. 타임라인은 조회 UI를 풍부하게 할 뿐 접근제어를 바꾸지 않는다.
- 이벤트 시드/발생을 `count == 0` 및 관리자 액션 두 경로로 넣어 기존 볼륨에서도(클린 시드 없이) 채워지도록 함.

## 이후 변경

- VULN-037 정상화 시 배송 조회를 주문 소유자/인증 기반으로 제한하면 타임라인 노출도 함께 제한된다.
  관련 [[VULN-037-shipment-tracking-idor]].
