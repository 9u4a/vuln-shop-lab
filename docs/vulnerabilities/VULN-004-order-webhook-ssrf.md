# VULN-004 주문 webhook URL SSRF

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A01:2025 Broken Access Control (SSRF)

## 위치

- `apps/node-express/src/routes/orders.js` — `POST /api/orders`가 요청 바디의 `webhookUrl`을 검증 없이 `orders.webhook_url`에 저장하고, 결제 확인(`POST /api/orders/:id/confirm`) 성공 시 `fireWebhook()`이 그 URL로 서버가 직접 `fetch()`를 호출한다.
- `apps/java-spring/src/main/java/com/vulnlab/shop/controller/OrderController.java` — 동일 구조. `create()`가 `webhookUrl`을 무검증으로 `Order.webhookUrl`에 저장하고, `confirm()` 성공 시 `fireWebhook()`이 `HttpClient`로 그 URL에 직접 `POST` 요청을 보낸다.

```js
async function fireWebhook(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, { method: 'POST', ... });
  } catch (err) { ... }
}
```

두 스택 모두 URL 스킴/호스트에 대한 allowlist가 전혀 없다 — `http://169.254.169.254/...` 같은 내부망·메타데이터 주소도 그대로 요청한다.

이 UI 필드(Cart 페이지의 "Order webhook URL")는 제거했고, `POST /api/orders`가 여전히 `webhookUrl` 바디를
받지만 **실제 발송은 결제 확인 경로 안쪽에서만** 일어난다(아래 재현 제약).

## 트리거 방법

```
POST /api/orders
{"items":[{"productId":1,"quantity":1}],"webhookUrl":"http://<collaborator-host>/"}
→ 이어서 POST /api/orders/:id/confirm  (Toss 결제 확인 성공 시에만 fireWebhook 발화)
```

**재현 제약(중요)**: `fireWebhook`는 `confirm()`이 **Toss 결제 확인에 성공한 뒤에만** 호출된다.
`confirm`은 `TOSS_SECRET_KEY`가 없으면 501을 반환하고(기본 랩 상태), 있어도 실제 Toss 위젯 결제로 받은
유효한 `paymentKey`로 `https://api.tosspayments.com/.../confirm`이 <300을 반환해야 진행된다. 따라서
"주문 생성 → confirm 한 번"만으로는 발송되지 않으며, **재현하려면 Toss 테스트 키 설정 + 위젯 결제 완주가
필요**하다. 무-Toss 랩에서는 발화하지 않음.

응답 반환형이며 관리자만 있으면 바로 재현되는 SSRF는 [[VULN-033-restock-callback-ssrf]]
(웹훅 테스트 버튼)을 참고 — 004는 blind + 결제경로 게이팅이라 실증 난이도가 높다.

## 영향

- (게이팅을 통과하면) 서버를 프록시 삼아 임의 내부/외부 호스트로 blind 아웃바운드 요청 — 내부망 스캐닝,
  메타데이터 엔드포인트 접근 시도 등. 5초 타임아웃 외 제약 없음.

## 증거 (재현 확인)

**재현 제약**: 2026-09-01 코드 확인 기준 `fireWebhook`는 Toss confirm 성공 분기에서만 호출되고, 기본 랩은
`TOSS_SECRET_KEY` 미설정이라 `confirm`이 501 → 웹훅 미발송. 따라서 무-Toss 환경에서 문서 페이로드만으로는
**재현되지 않음**(발송 자체가 게이팅됨). 실증은 Toss 테스트 결제 완주 후 Collaborator 수신으로 확인해야 함.

## 정상 서비스 흐름에서의 어색함

주문 웹훅 UI는 제거됐고 body 파라미터만 남아, 실제 발송이 결제 성공 경로 깊숙이에서만 일어난다 — 정상
서비스로는 노출 지점이 거의 없고 실증도 어렵다. **후속 개선 후보**: (a) 발송을 order lifecycle의 명시적
"주문 알림 웹훅 등록/테스트" 기능으로 자연스럽게 노출하거나, (b) VULN-033처럼 응답 반환형 테스트 경로로
정리. (이번 감사에서는 코드 미변경, 문서로만 명시.)

## 조치 상태: 미조치 (의도된 취약점)
