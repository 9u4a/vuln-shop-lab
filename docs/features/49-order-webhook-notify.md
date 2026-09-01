# 49. 주문 알림 웹훅

브랜치: `feature/order-webhook-notify` · 관련 취약점: [VULN-004](../vulnerabilities/VULN-004-order-webhook-ssrf.md)

## 무엇을 만들었나

- 체크아웃에 선택 입력 **"주문 알림 URL"** 을 추가. 주문을 넣으면 서버가 그 URL로 **주문 접수 알림
  웹훅**(`order.created`, status `pending`)을 즉시 발송한다. 결제 확인(confirm) 성공 시 `order.paid`도 발송.
- 양 스택: node `fireWebhook`(`fetch`, fire-and-forget), java `fireWebhook`(`HttpClient.sendAsync`, 비차단).
- `POST /api/orders`의 `webhookUrl` 바디 필드로 전달, OpenAPI에도 반영.

## 설계 판단

- 기존 VULN-004(주문 webhook SSRF)는 웹훅이 **결제 confirm(Toss) 성공 경로에서만** 발화해, 정상 서비스
  흐름에 노출 지점이 거의 없고 무-Toss 랩에서는 재현 자체가 불가했다(감사에서 식별). 이를 실제 커머스에
  흔한 **주문 알림 웹훅**(주문 접수 시 등록 URL로 통지)으로 재구성해, 자연스러운 기능 안에서 주문 생성만으로
  발화하도록 했다.
- 취약점은 그대로 유지: URL 스킴/호스트 allowlist·검증이 전혀 없어 내부망(`http://mongo:27017` 등)·메타데이터
  주소로도 요청한다(blind SSRF). 응답 반환형(관리자 웹훅 테스트)은 VULN-033으로 분리돼 있다.

## 이후 변경

- VULN-004를 창구만 옮긴 게 아니라 재현 가능·자연스러운 형태로 재구성(문서 갱신). 정상 조치는 발송 전
  URL 검증(사설/링크로컬/메타데이터 대역 차단 + 스킴 화이트리스트).
