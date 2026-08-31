# 취약점 명세 (1단계 산출물) — 인덱스

`apps/node-express`, `apps/java-spring`에 의도적으로 심는 취약점을 하나의 ID로 추적한다.
파일명은 `VULN-001-<name>.md` 형식. 각 문서는 대상 스택 / 심각도 / OWASP 분류 / 위치(파일·엔드포인트) /
트리거 방법 / 영향 / 증거(재현 확인) / 조치 상태를 포함한다.

추적 흐름: `docs/vulnerabilities/*.md` (의도) → `docs/findings/*.md` (Burp 진단) → 수정 커밋 →
`docs/detection/*.md` (탐지 룰). findings/detection은 gitignore(로컬 전용).

## 등록된 취약점

| ID | 이름 | 스택 | OWASP 2021 | 심각도 | 상태 |
|----|------|------|-----------|--------|------|
| [VULN-001](VULN-001-sql-injection-product-search-node.md) | 상품 검색/정렬 SQL 인젝션 | node | A03 Injection | Critical | 구현됨 |
| [VULN-002](VULN-002-spel-injection-product-sort-java.md) | 상품 정렬 파라미터 SpEL 인젝션 | java | A03 Injection | Critical | 구현됨 |
| [VULN-003](VULN-003-qna-secret-question-access-control.md) | 비밀 문의(Q&A) 본문 상세 API 노출 (클라이언트 마스킹만) | both + client | A01 Broken Access Control | Medium | 구현됨 |
| [VULN-004](VULN-004-order-webhook-ssrf.md) | 주문 webhook URL SSRF | both | A10 SSRF | High | 구현됨 |
| [VULN-005](VULN-005-sql-injection-product-search-java.md) | 상품 검색/필터 SQL 인젝션 (001의 java 짝) | java | A03 Injection | Critical | 구현됨 |
| [VULN-006](VULN-006-session-fixation-no-lockout.md) | 세션 고정 + 로그인 시도 제한 없음 | both | A07 Auth Failures | Medium | 구현됨 (문서형) |
| [VULN-007](VULN-007-security-misconfiguration-exposure.md) | 진단 엔드포인트 노출 (actuator `*` / dev 스택트레이스) | both | A05 Misconfiguration | Medium | 구현됨 |
| [VULN-008](VULN-008-stored-xss-review-body.md) | 상품 리뷰 본문 저장형 XSS | both + client | A03 Injection (XSS) | High | 구현됨 |
| [VULN-009](VULN-009-idor-review-update-delete.md) | 리뷰 수정/삭제 IDOR (소유권 미검증) | both | A01 Broken Access Control | Medium | 구현됨 |
| [VULN-010](VULN-010-command-injection-receipt.md) | 영수증 생성 OS 커맨드 인젝션 | node | A03 Injection (OS Command) | Critical | 구현됨 |
| [VULN-011](VULN-011-path-traversal-receipt-download.md) | 영수증 다운로드 경로 순회 | both | A01 Broken Access Control | High | 구현됨 |
| [VULN-012](VULN-012-insecure-deserialization-cart-import.md) | 장바구니 임포트 Jackson 역직렬화 | java | A08 Data Integrity Failures | Critical | 구현됨 |
| [VULN-013](VULN-013-mass-assignment-profile-privesc.md) | 프로필 업데이트 대량 할당 → 권한 상승 | both | A01 Broken Access Control | Critical | 구현됨 |
| [VULN-014](VULN-014-csrf-no-token-samesite-none.md) | CSRF — 토큰 부재 + `SameSite=None` 쿠키 | both | A01 Broken Access Control | High | 구현됨 |
| [VULN-015](VULN-015-order-quantity-business-logic.md) | 주문 수량 음수/0 → 결제액 조작 | both | A04 Insecure Design | High | 구현됨 |
| [VULN-016](VULN-016-reflected-xss-receipt-print.md) | 인쇄용 영수증 HTML 반사형 XSS | both | A03 Injection (XSS) | High | 구현됨 |
| [VULN-017](VULN-017-dom-xss-product-search-heading.md) | 상품 검색 결과 헤딩 DOM 기반 XSS | client | A03 Injection (XSS) | Medium | 구현됨 |
| [VULN-018](VULN-018-unrestricted-file-upload-content-type.md) | 파일 업로드 Content-Type 신뢰 → 앱 오리진 저장형 XSS | both | A05 Misconfiguration | High | 구현됨 |
| [VULN-019](VULN-019-command-injection-receipt-java.md) | Java 영수증 생성 OS 커맨드 인젝션 (010의 java 짝) | java | A03 Injection (OS Command) | Critical | 구현됨 |
| [VULN-020](VULN-020-xxe-catalog-import.md) | XML 상품 임포트 XXE | java | A05 Misconfiguration | High | 구현됨 |
| [VULN-021](VULN-021-commons-text-1.9-text4shell.md) | 취약 의존성 `commons-text:1.9` (CVE-2022-42889 Text4Shell) | java | A06 Vulnerable Components | Critical | 구현됨 |
| [VULN-022](VULN-022-nosql-injection-activity.md) | Mongo 기반 활동 피드 NoSQL 인젝션 | node | A03 Injection (NoSQL) | High | 구현됨 |
| [VULN-023](VULN-023-stored-xss-event-popup.md) | 이벤트 팝업 본문 저장형 XSS (메인 페이지 전역 렌더) | both + client | A03 Injection (XSS) | High | 구현됨 |
| [VULN-024](VULN-024-idor-wishlist-userid.md) | 위시리스트 조회 IDOR (`userId` 파라미터 신뢰) | both | A01 Broken Access Control | Medium | 구현됨 |
| [VULN-025](VULN-025-unrestricted-review-image-upload.md) | 후기 이미지 업로드 Content-Type 신뢰 → 저장형 XSS | both | A05 Misconfiguration | High | 구현됨 |
| [VULN-026](VULN-026-broken-access-control-secret-review.md) | 비밀 후기 본문 API 노출 (클라이언트 마스킹만) | both + client | A01 Broken Access Control | Medium | 구현됨 |
| [VULN-027](VULN-027-order-option-not-validated.md) | 주문 옵션 값 미검증 (제공 옵션과 대조 없음) | both | A04 Insecure Design | Low | 구현됨 |
| [VULN-028](VULN-028-stored-xss-login-log-user-agent.md) | 접속 로그 User-Agent 저장형 XSS (관리자 대상) | both + client | A03 Injection (XSS) | High | 구현됨 |
| [VULN-029](VULN-029-coupon-claim-no-dedup.md) | 쿠폰 중복 발급 (claim 한도/중복 검증 없음) | both | A04 Insecure Design | Low | 구현됨 |
| [VULN-030](VULN-030-point-balance-manipulation.md) | 포인트 사용 미검증 → 결제액/잔액 조작 | both | A04 Insecure Design | High | 구현됨 |
| [VULN-031](VULN-031-refund-access-control.md) | 반품/환불 접근제어·상태검증 누락 (IDOR + 이중환불) | both | A01 Broken Access Control | High | 구현됨 |
| [VULN-032](VULN-032-referral-reward-abuse.md) | 추천 보상 무한 적립 (멱등성·자기참조 미검증) | both | A04 Insecure Design | Medium | 구현됨 |
| [VULN-033](VULN-033-restock-callback-ssrf.md) | 재입고 알림 콜백 URL SSRF (응답 반환형) | both | A10 SSRF | High | 구현됨 |
| [VULN-034](VULN-034-unauthenticated-openapi-docs.md) | 인증 없는 OpenAPI 명세 · Swagger UI 노출 (API 인벤토리) | both | A05 Misconfiguration | Low | 구현됨 |

## OWASP / CLAUDE.md 스코프 커버리지

| 스코프 항목 | 상태 | VULN |
|-------------|------|------|
| Injection — SQLi | DONE | 001, 005 |
| Injection — OS Command | DONE | 010 (node), 019 (java) |
| Injection — SpEL/OGNL (Spring) | DONE | 002 |
| Injection — NoSQL (Express) | DONE (Mongo 컨테이너) | 022 |
| Broken Authentication / Session Management | DONE | 006 |
| XSS — Stored | DONE | 008, 018, 023, 025, 028 |
| XSS — Reflected | DONE | 016 |
| XSS — DOM | DONE | 017 |
| IDOR / Broken Access Control | DONE | 003, 009, 011, 013, 014, 024, 026, 031 |
| Security Misconfiguration | DONE | 007, 018, 020, 025, 034 |
| Insecure Deserialization (Java) | DONE | 012 |
| XXE | DONE | 020 |
| SSRF | DONE | 004 (020 OOB로 재확인), 033 (응답 반환형) |
| File Upload / Path Traversal | DONE | 011 (traversal), 018 (upload) |
| Vulnerable dependencies | DONE | 021 |
| Business logic / Insecure Design | DONE | 015, 027, 029, 030, 032 |
| CSRF | DONE | 014 |

배치 013–022 완료 — CLAUDE.md 스코프의 모든 클래스가 최소 1개 구현 항목으로 커버된다.
VULN-023은 이벤트 팝업 기능(`docs/features/25-event-popups.md`)과 함께 추가된 저장형 XSS.
VULN-024는 좋아요/위시리스트 기능(`docs/features/27-product-likes.md`)과 함께 추가된 위시리스트 IDOR.
VULN-025·026은 후기 사진 업로드/비밀글 기능(`docs/features/28-reviews-media-secret.md`)과 함께 추가.
VULN-027은 장바구니 옵션 변경 기능(`docs/features/29-cart-option-edit.md`)에서 드러난 주문 옵션 미검증.
VULN-028은 관리자 접속 로그/사용자 활성화 기능(`docs/features/30-admin-access-logs.md`)과 함께 추가된 로그 뷰어 저장형 XSS.
VULN-029는 쿠폰 기능(`docs/features/31-events-coupons-uploads.md`)과 함께 추가된 쿠폰 중복 발급.
VULN-003은 Q&A 문의 게시판(`docs/features/32-qna-and-faq-board.md`)과 함께 추가된 비밀 문의 상세 노출
(비밀 후기 VULN-026과 동일 계열, 새 표면).
같은 배치에서 공지/이벤트 이미지 업로드가 공용 업로드 엔드포인트로 전환되며 VULN-018 표면이,
이벤트 본문이 `/events` 페이지에도 렌더되며 VULN-023 표면이 확장됨(신규 ID 없음).
의류 카탈로그(`docs/features/26-apparel-catalog.md`)에서 상품 필터 파라미터 추가로 VULN-001/005 SQLi 표면이 확장됨(신규 ID 없음).
VULN-030~033은 커머스 리워드/운영 기능 배치(`docs/features/39-points.md`~`42-restock-alerts.md`)와 함께 추가:
포인트(030)·반품환불(031)·추천인(032)·재입고 알림(033). 033은 blind SSRF(VULN-004)와 달리 응답 반환형으로 SSRF 표면을 확장.
VULN-034는 OpenAPI 문서화 기능(`docs/features/43-openapi-docs.md`)과 함께 추가된 자기문서화 표면 노출.
VULN-007(진단 엔드포인트)과 같은 A05지만 유출물(런타임 내부 상태 vs API 인벤토리)·노출 경계
(WAS 직접 포트 전용 vs nginx 공개 진입점 :8090)·정상 구현이 모두 달라 별도 ID로 둔다.

번호 주의: VULN-003은 원래 "기본 관리자 계정"으로 잡았다가 취약점이 아니라 철회된 번호이며, 빈 번호를
없애기 위해 마지막 항목을 옮겨 재사용했다(구 VULN-030 — 그 이전 커밋 이력에는 030으로 기록되어 있다).
