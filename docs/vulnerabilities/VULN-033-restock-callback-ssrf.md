# VULN-033 알림 연동 웹훅 테스트 SSRF (응답 반환형)

- 대상 스택: node-express, java-spring
- 심각도: High
- 분류: A10:2021 Server-Side Request Forgery (CWE-918)

## 위치

관리자 알림 연동(웹훅) "테스트 요청" 기능이 관리자가 입력한 URL을 **allowlist 없이 서버에서 그대로
요청하고, 그 응답 본문을 호출자에게 반환**한다. 실제 커머스/SaaS의 Slack·ERP 연동 "테스트 발송"
버튼과 동일한 형태이며, 관리자 권한이어도 관리자 브라우저가 도달할 수 없는 내부망에 서버가 도달한다.
기존 주문 webhook SSRF([[VULN-004-order-webhook-ssrf]])가 blind(fire-and-forget)인 것과 달리, 여기서는
응답이 되돌아와 내부 서비스 읽기가 가능하다.

웹훅 URL은 `store_settings`에 영속 저장되며(`PUT /api/admin/settings`), 테스트는 입력값 또는 저장값을
사용한다. 재입고 발송(`/restock/notify/:productId`) 시에도 저장된 웹훅으로 서버가 전달(blind)한다.

- node: `apps/node-express/src/routes/admin.js`, `POST /api/admin/integrations/webhook/test` —
  `fetch(url ?? 저장값)` 후 `res.json({ status, body })`로 응답 반환.
- java: `apps/java-spring/.../controller/AdminController.java`, `testWebhook` — 요청 로직은
  `apps/java-spring/.../vuln/CallbackFetcher.java`로 격리, 응답 status/body를 반환.

※ 재입고 알림(feature 42) 자체는 사용자 URL 입력 없이 인앱 통지로 동작한다. SSRF 표면은 그 알림을
외부로 전달하는 관리자 연동 웹훅 테스트에 위치한다.

## 트리거 방법

```
POST /api/admin/integrations/webhook/test   (관리자)
{"url":"http://mongo:27017"}
→ 서버가 내부 mongo:27017로 GET, 응답 본문을 그대로 반환
  (169.254.169.254 메타데이터, java :8081/actuator 등 내부 자원도 동일하게 도달)
```

## 영향

- 내부망 서비스·클라우드 메타데이터 엔드포인트를 서버 경유로 조회 → 내부 정찰 및 민감정보 유출.

## 증거 (재현 확인)

2026-08-31, 클린 재시드 후 로컬 재현(양 스택 동일): 웹훅 테스트 URL을 `http://mongo:27017`로 요청 시
응답 `body`에 MongoDB의 "It looks like you are trying to access MongoDB over HTTP on the native
driver port." 내부 응답이 반환됨.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 웹훅 URL을 스킴(https)·공인 IP·도메인 allowlist로 제한, DNS 재바인딩 대비 확인 후 요청,
내부 대역(RFC1918/loopback/link-local) 차단, 응답 본문을 호출자에게 반환하지 않음.
관련: [[VULN-004-order-webhook-ssrf]](blind SSRF), [[VULN-020-xxe-catalog-import]](XXE OOB).
