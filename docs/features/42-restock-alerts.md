# 42. 재입고 알림

브랜치: `feature/commerce-rewards-batch` · 관련 취약점: [VULN-033](../vulnerabilities/VULN-033-restock-callback-ssrf.md)

## 무엇을 만들었나

- `restock_subscriptions` 테이블(상품·회원·콜백 URL). 품절(stock=0) 상품 상세에서 재입고 알림 신청
  (+선택 웹훅 URL). 관리자 "재입고 알림" 탭에서 구독 목록 조회 + 통지 발송.
- 신규 API: `POST /api/restock`, `GET /api/restock/mine`(사용자), `GET /api/restock`,
  `POST /api/restock/:id/send`(관리자). 발송 시 서버가 콜백으로 요청하고 응답을 반환.
- 신규 관리자 페이지 `AdminRestock.jsx`(발송 결과 응답 본문 표시), 상품 상세(`ProductDetail.jsx`) 신청 UI.

## 설계 판단

- java의 콜백 요청 로직은 의도된 취약 코드 격리 규약에 따라 `vuln/CallbackFetcher.java`로 분리.
- 기존 주문 webhook(VULN-004)은 blind였기에, 여기서는 **응답을 호출자에게 반환**해 SSRF 표면을 차별화.

## 이후 변경

- VULN-033을 의도적으로 남김: 콜백 URL allowlist 부재 + 응답 반환형 SSRF(내부망/메타데이터 조회).
