# 42. 재입고 알림

브랜치: `feature/commerce-rewards-batch` · 관련 취약점: [VULN-033](../vulnerabilities/VULN-033-restock-callback-ssrf.md)

## 무엇을 만들었나

- `restock_subscriptions` 테이블(상품·회원·통지 여부). 품절(stock=0) 상품 상세에서 버튼 한 번으로
  재입고 알림 신청(중복 신청은 무시). 관리자 "재입고 알림" 탭에서 구독 목록 조회 + 상품별 통지 발송(인앱).
- 신규 API: `POST /api/restock`(상품만), `GET /api/restock/mine`(사용자), `GET /api/restock`,
  `POST /api/restock/notify/:productId`(관리자, 해당 상품 구독자 notified 처리).
- 관리자 알림 연동(웹훅) 설정 + "테스트 요청": `POST /api/admin/integrations/webhook/test` — 재입고/주문
  알림을 외부(Slack/ERP 등)로 전달할 웹훅을 관리자가 설정/테스트. 여기가 SSRF 표면(VULN-033).
- 신규 관리자 페이지 `AdminRestock.jsx`(구독 목록 + 연동 웹훅 테스트), 상품 상세(`ProductDetail.jsx`) 신청 버튼.

## 설계 판단

- 초기 설계는 사용자가 콜백 URL을 입력하는 방식이었으나, 실제 커머스에서 쇼핑객이 웹훅 URL을 넣지
  않는다는 지적을 반영해 **사용자 신청은 URL 없이 인앱 통지**로 재설계.
- SSRF는 실제 앱(Shopify/Slack/GitLab 등)의 대표 패턴인 **관리자 연동 웹훅 "테스트 발송"** 으로 이동.
  관리자 권한이어도 관리자 브라우저가 못 가는 내부망에 서버가 도달하므로 유효한 SSRF.
- java의 요청 로직은 의도된 취약 코드 격리 규약에 따라 `vuln/CallbackFetcher.java`로 분리.

## 이후 변경

- VULN-033을 의도적으로 남김: 연동 웹훅 URL allowlist 부재 + 응답 반환형 SSRF(내부망/메타데이터 조회).
