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
| VULN-003 | ~~기본 관리자 계정~~ | — | — | — | 철회 (데모용 픽스처, 취약점 아님) |
| [VULN-004](VULN-004-order-webhook-ssrf.md) | 주문 webhook URL SSRF | both | A10 SSRF | High | 구현됨 |
| [VULN-005](VULN-005-sql-injection-product-search-java.md) | 상품 검색/필터 SQL 인젝션 (001의 java 짝) | java | A03 Injection | Critical | 구현됨 |
| [VULN-006](VULN-006-session-fixation-no-lockout.md) | 세션 고정 + 로그인 시도 제한 없음 | both | A07 Auth Failures | Medium | 구현됨 (문서형) |
| [VULN-007](VULN-007-security-misconfiguration-exposure.md) | 진단 엔드포인트 노출 (actuator `*` / dev 스택트레이스) | both | A05 Misconfiguration | Medium | 구현됨 |
| [VULN-008](VULN-008-stored-xss-review-body.md) | 상품 리뷰 본문 저장형 XSS | both + client | A03 Injection (XSS) | High | 구현됨 |
| [VULN-009](VULN-009-idor-review-update-delete.md) | 리뷰 수정/삭제 IDOR (소유권 미검증) | both | A01 Broken Access Control | Medium | 구현됨 |
| [VULN-010](VULN-010-command-injection-receipt.md) | 영수증 생성 OS 커맨드 인젝션 | node | A03 Injection (OS Command) | Critical | 구현됨 |
| [VULN-011](VULN-011-path-traversal-receipt-download.md) | 영수증 다운로드 경로 순회 | both | A01 Broken Access Control | High | 구현됨 |
| [VULN-012](VULN-012-insecure-deserialization-cart-import.md) | 장바구니 임포트 Jackson 역직렬화 | java | A08 Data Integrity Failures | Critical | 구현됨 |
| VULN-013 | 프로필 업데이트 대량 할당 → 권한 상승 | both | A01 Broken Access Control | Critical | 계획됨 |
| VULN-014 | CSRF — 토큰 부재 + `SameSite=None` 쿠키 | both | A01 Broken Access Control | High | 계획됨 |
| VULN-015 | 주문 수량 음수/0 → 결제액 조작 | both | A04 Insecure Design | High | 계획됨 |
| VULN-016 | 인쇄용 영수증 HTML 반사형 XSS | both | A03 Injection (XSS) | High | 계획됨 |
| VULN-017 | 상품 검색 결과 헤딩 DOM 기반 XSS | client | A03 Injection (XSS) | Medium | 계획됨 |
| VULN-018 | 파일 업로드 Content-Type 신뢰 → 앱 오리진 저장형 XSS | both | A05 Misconfiguration | High | 계획됨 |
| VULN-019 | Java 영수증 생성 OS 커맨드 인젝션 (010의 java 짝) | java | A03 Injection (OS Command) | Critical | 계획됨 |
| VULN-020 | XML 상품 임포트 XXE | java | A05 Misconfiguration | High | 계획됨 |
| VULN-021 | 취약 의존성 `commons-text:1.9` (CVE-2022-42889 Text4Shell) | java | A06 Vulnerable Components | Critical | 계획됨 |
| VULN-022 | Mongo 기반 검색/활동 기능 NoSQL 인젝션 | node | A03 Injection (NoSQL) | High | 계획됨 |

## OWASP / CLAUDE.md 스코프 커버리지

| 스코프 항목 | 상태 | VULN |
|-------------|------|------|
| Injection — SQLi | DONE | 001, 005 |
| Injection — OS Command | DONE (node) / PLANNED (java) | 010 / 019 |
| Injection — SpEL/OGNL (Spring) | DONE | 002 |
| Injection — NoSQL (Express) | PLANNED (Mongo 컨테이너 추가) | 022 |
| Broken Authentication / Session Management | DONE | 006 |
| XSS — Stored | DONE | 008, 018 |
| XSS — Reflected | PLANNED | 016 |
| XSS — DOM | PLANNED | 017 |
| IDOR / Broken Access Control | DONE | 009, 011 (+ PLANNED 013, 014) |
| Security Misconfiguration | DONE | 007 (+ PLANNED 018, 020) |
| Insecure Deserialization (Java) | DONE | 012 |
| SSRF | DONE | 004 (XXE OOB로 재확인: 020) |
| File Upload / Path Traversal | DONE (traversal) / PLANNED (upload) | 011 / 018 |
| Vulnerable dependencies | PLANNED | 021 |
| Business logic / Insecure Design | PLANNED | 015 |
| CSRF | PLANNED | 014 |

이 배치(013–022) 완료 시 CLAUDE.md 스코프의 모든 클래스가 최소 1개 항목으로 커버된다.
