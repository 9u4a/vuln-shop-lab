# VULN-037 배송 조회 IDOR → 구매자 배송 PII 노출

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A01:2025 Broken Access Control (CWE-639 Authorization Bypass Through User-Controlled Key, CWE-200)

## 위치

비회원 배송조회 엔드포인트가 **세션 검사 없이** 송장번호만으로 배송 정보와 주문 배송지 스냅샷
(`ship_name`·`ship_phone`·`ship_postcode`·`ship_address`·`ship_address_detail`)을 반환한다. 송장번호는
**순차 발번**(`1000000000 + shipment.id`, 예: `1000000001`, `1000000002`, …)이라 열거가 자명하다.

- node: `apps/node-express/src/routes/shipments.js`, `GET /track` — `shipments`⋈`orders` 조회 후
  배송지 필드를 그대로 응답. 발번은 `routes/admin.js`의 `PUT /orders/:id/shipment`.
- java: `.../controller/ShipmentController.java`, `GET /api/shipments/track` — 동일. 발번은
  `AdminController.setShipment`(`1000000000L + s.getId()`).

## 트리거 방법

```
GET /api/{stack}/shipments/track?no=1000000001
GET /api/{stack}/shipments/track?no=1000000002
GET /api/{stack}/shipments/track?no=1000000003
...

→ 로그인·쿠키 없이 각 주문의 shipName / shipPhone / shipPostcode / shipAddress / shipAddressDetail 반환.
  송장번호를 1씩 증가시키며 순회하면 전 구매자의 이름·연락처·주소를 수집할 수 있다.
```

## 영향

- 인증 없이 전 구매자의 **이름·전화번호·전체 배송 주소**를 대량 수집 → 스피어피싱·택배 사칭·주소
  기반 위협에 직접 쓰인다. 개인정보보호법상 유출 사고에 해당.
- 순차 송장번호라 별도 크롤링 기법 없이 `for` 루프만으로 전량 덤프 가능.
- 주문 상세(`/orders/:id`)는 소유권을 검증하지만, 이 `shipments/track` 표면은 그 검증을 완전히 우회한다.
- VULN-031(반품 IDOR)이 반품 레코드에 대한 것이라면, 037은 배송 PII에 대한 별도 표면.

## 증거 (재현 확인)

2026-09-01, 클린 재시드 후 로컬 재현(양 스택 동일): 쿠키 없이
`GET /api/node/shipments/track?no=1000000001` → `{"shipName":"김철수","shipPhone":"010-1111-2222",
"shipAddress":"서울특별시 마포구 샘플길 34", ...}` (주문 #1은 user1 소유).

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 비회원 조회를 유지하려면 (a) 송장번호를 **추측 불가능한 랜덤 값**으로 발번하고,
(b) 조회 응답에서 PII를 **마스킹**(`홍*동`, `010-****-8888`, 시·구까지만)하며,
(c) 주문번호+수령인명/전화 뒷자리 등 **본인확인 요소를 함께 요구**한다. 회원 배송조회는
세션 소유권 검사(`order.user_id === session.user.id`)를 강제.

관련: [[VULN-031-refund-access-control]], [[VULN-024-idor-wishlist-userid]], [[VULN-003-qna-secret-question-access-control]], [[VULN-038-predictable-order-share-token]]
