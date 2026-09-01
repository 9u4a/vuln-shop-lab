# Vuln Shop Security Lab

취약 웹앱 개발 → 진단 → 조치 → 탐지·대응까지 **한 사이클을 도는 보안 학습 프로젝트**. 동일한 쇼핑몰
시나리오를 Node.js/Express와 Java/Spring Boot 두 스택으로 미러링해, 같은 취약점 세트를 언어·프레임워크
간에 비교하며 다룬다.

> [!WARNING]
> **이 저장소의 코드에는 의도적으로 심어 둔 취약점이 있습니다.**
> - 로컬 또는 격리된 네트워크(예: Docker 브리지)에서만 구동하세요. **인터넷에 노출 금지.**
> - 실제 서비스·제3자를 대상으로 사용하지 마세요. 오직 통제된 학습 목적입니다.
> - 모든 계정·주문·연락처는 **더미 데이터**이며, 실제 개인정보·비밀키는 포함하지 않습니다.
> - Burp Suite 등 진단 트래픽은 이 저장소의 로컬 인스턴스에만 겨눕니다.

---

## 워크플로우 (4단계)

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| **Phase 1 — 개발** | 취약 앱 구현 (양 스택 미러). OWASP Top 10 범위의 의도적 취약점 삽입 | 진행 (43기능 · 38취약점, OWASP 2025 앱 취약점 클래스 커버) |
| **Phase 2 — 진단** | Burp Suite로 트래픽 캡처 → 재현 → 스캐너 확인 → findings 문서화 | 진행 |
| **Phase 3 — 조치** | findings 기준 수정, 동일 절차로 재검증 (양 스택) | 진행 |
| **Phase 4 — 탐지·대응** | Wazuh/ELK로 공격 트래픽 탐지 → 트리아지 → 대응 룰 구축 | 예정 (`infra/`) |

각 취약점은 하나의 ID(`VULN-NNN`)로 **의도(`docs/vulnerabilities/`) → 진단(`docs/findings/`) → 수정 커밋 →
탐지 룰(`docs/detection/`)** 전 과정을 관통한다.

---

## 아키텍처

2계층(웹서버 → WAS) 구성에, 동일 시나리오를 **두 백엔드 스택으로 미러링**한다.

```
                         ┌─────────────────────────────┐
   브라우저  ──▶  nginx  │  node-express  :3000  ─── SQLite(node:sqlite)
              (:8090)    │                       └── MongoDB(활동 피드 / NoSQLi)
   운영형 진입점         │  java-spring   :8081  ─── H2 (JPA)
                         └─────────────────────────────┘
   Vite 개발 서버(:5173)은 핫리로드용 별도 진입점 — 홈에서 대상 백엔드 전환
```

- **nginx**(`:8090`)가 빌드된 클라이언트를 서빙하고 `/api/node`·`/api/java`·`/uploads/*`를 각 WAS로
  리버스 프록시한다. 운영형(production-like) 진입점.
- **client**는 하나의 React 앱이 두 백엔드를 모두 호출할 수 있어, 같은 화면에서 node ↔ java 취약점을 비교한다.
- 두 백엔드는 인증(세션 쿠키)·기능·취약점 세트가 동일하되, 구현은 스택별 관용을 따른다
  (node: prepared statement/쿼리 빌더, java: JPA/`PreparedStatement`).

### 기술 스택

| 계층 | 사용 기술 |
| --- | --- |
| 프런트엔드 | React + Vite (React Router) |
| Node 백엔드 | Express 4 · `node:sqlite`(내장 SQLite, Node 22.5+) · MongoDB(활동 피드) |
| Java 백엔드 | Spring Boot 3.3 · Java 17 · H2 · JPA |
| 웹서버 | nginx (리버스 프록시 + 정적 서빙) |
| 실행 | Docker Compose (격리 브리지 네트워크) |
| 결제(테스트) | Toss Payments 테스트 위젯 (키 없으면 결제 단계만 건너뜀) |

> 일부 의존성은 **의도적으로 고정된 취약 버전**입니다(예: `multer 1.4.5-lts.1`, `commons-text:1.9`).
> 함부로 올리지 마세요 — 관련 `VULN-NNN` 문서에 근거가 명시된 경우에만 변경합니다.

---

## 빠른 시작 (Docker)

```
copy .env.example .env
docker compose up --build
```

### 접속 URL

| 진입점 | URL | 용도 |
| --- | --- | --- |
| nginx | http://localhost:8090 | 운영형 진입점 (권장) |
| client (Vite) | http://localhost:5173 | 개발 핫리로드, 홈에서 백엔드 전환 |
| node-express API | http://localhost:3000 | WAS 직접 |
| java-spring API | http://localhost:8081 | WAS 직접 |
| **API 문서** | http://localhost:8090/api-docs | Swagger UI (node/java) — **의도적 무인증 노출, VULN-034** |

### 시드 계정 (로컬 전용 더미 자격증명)

| 아이디 | 비밀번호 | 역할 |
| --- | --- | --- |
| `9u4a` | `9u4a` | system_admin |
| `admin` | `admin` | admin |
| `user1` | `user1` | user |
| `user2` / `user3` | 각 아이디와 동일 | user |

> 전부 학습용 더미 계정입니다. 실제 자격증명이 아니며, 로컬 환경 밖에서 의미가 없습니다.

### 초기화

```
docker compose down -v      # DB·업로드 볼륨까지 전부 리셋 후 클린 재시드
```

DB는 named volume(`node_data`, `java_data`, `mongo_data`)과 업로드 볼륨에 영속화됩니다.

---

## 취약점 카탈로그

의도적으로 심은 취약점 38건. **원본 인덱스와 재현 절차·조치 상태는
[`docs/vulnerabilities/README.md`](docs/vulnerabilities/README.md)** 에 있으며, 아래 표는 공개용 요약입니다.

| ID | 이름 | 스택 | OWASP 2025 | 심각도 |
|----|------|------|-----------|--------|
| [VULN-001](docs/vulnerabilities/VULN-001-sql-injection-product-search-node.md) | 상품 검색/정렬 SQL 인젝션 | node | A05 Injection | Critical |
| [VULN-002](docs/vulnerabilities/VULN-002-spel-injection-product-sort-java.md) | 상품 정렬 파라미터 SpEL 인젝션 | java | A05 Injection | Critical |
| [VULN-003](docs/vulnerabilities/VULN-003-qna-secret-question-access-control.md) | 비밀 문의(Q&A) 본문 상세 API 노출 | both + client | A01 Broken Access Control | Medium |
| [VULN-004](docs/vulnerabilities/VULN-004-order-webhook-ssrf.md) | 주문 webhook URL SSRF | both | A01 Broken Access Control (SSRF) | High |
| [VULN-005](docs/vulnerabilities/VULN-005-sql-injection-product-search-java.md) | 상품 검색/필터 SQL 인젝션 (001의 java 짝) | java | A05 Injection | Critical |
| [VULN-006](docs/vulnerabilities/VULN-006-session-fixation-no-lockout.md) | 세션 고정 + 로그인 시도 제한 없음 | both | A07 Auth Failures | Medium |
| [VULN-007](docs/vulnerabilities/VULN-007-security-misconfiguration-exposure.md) | 진단 엔드포인트 노출 (actuator/dev 스택트레이스) | both | A02 Misconfiguration | Medium |
| [VULN-008](docs/vulnerabilities/VULN-008-stored-xss-review-body.md) | 상품 리뷰 본문 저장형 XSS | both + client | A05 Injection (XSS) | High |
| [VULN-009](docs/vulnerabilities/VULN-009-idor-review-update-delete.md) | 리뷰 수정/삭제 IDOR | both | A01 Broken Access Control | Medium |
| [VULN-010](docs/vulnerabilities/VULN-010-command-injection-receipt.md) | 영수증 생성 OS 커맨드 인젝션 | node | A05 Injection (OS Command) | Critical |
| [VULN-011](docs/vulnerabilities/VULN-011-path-traversal-receipt-download.md) | 영수증 다운로드 경로 순회 | both | A01 Broken Access Control | High |
| [VULN-012](docs/vulnerabilities/VULN-012-insecure-deserialization-cart-import.md) | 장바구니 임포트 Jackson 역직렬화 | java | A08 Data Integrity Failures | Critical |
| [VULN-013](docs/vulnerabilities/VULN-013-mass-assignment-profile-privesc.md) | 프로필 대량 할당 → 권한 상승 | both | A01 Broken Access Control | Critical |
| [VULN-014](docs/vulnerabilities/VULN-014-csrf-no-token-samesite-none.md) | CSRF — 토큰 부재 + `SameSite=None` | both | A01 Broken Access Control | High |
| [VULN-015](docs/vulnerabilities/VULN-015-order-quantity-business-logic.md) | 주문 수량 음수/0 → 결제액 조작 | both | A06 Insecure Design | High |
| [VULN-016](docs/vulnerabilities/VULN-016-reflected-xss-receipt-print.md) | 인쇄용 영수증 HTML 반사형 XSS | both | A05 Injection (XSS) | High |
| [VULN-017](docs/vulnerabilities/VULN-017-dom-xss-product-search-heading.md) | 상품 검색 결과 헤딩 DOM 기반 XSS | client | A05 Injection (XSS) | Medium |
| [VULN-018](docs/vulnerabilities/VULN-018-unrestricted-file-upload-content-type.md) | 파일 업로드 Content-Type 신뢰 → 저장형 XSS | both | A02 Misconfiguration | High |
| [VULN-019](docs/vulnerabilities/VULN-019-command-injection-receipt-java.md) | Java 영수증 생성 OS 커맨드 인젝션 (010의 java 짝) | java | A05 Injection (OS Command) | Critical |
| [VULN-020](docs/vulnerabilities/VULN-020-xxe-catalog-import.md) | XML 상품 임포트 XXE | java | A02 Misconfiguration | High |
| [VULN-021](docs/vulnerabilities/VULN-021-commons-text-1.9-text4shell.md) | 취약 의존성 `commons-text:1.9` (Text4Shell) | java | A03 Software Supply Chain | Critical |
| [VULN-022](docs/vulnerabilities/VULN-022-nosql-injection-activity.md) | Mongo 활동 피드 NoSQL 인젝션 | node | A05 Injection (NoSQL) | High |
| [VULN-023](docs/vulnerabilities/VULN-023-stored-xss-event-popup.md) | 이벤트 팝업 본문 저장형 XSS (메인 전역 렌더) | both + client | A05 Injection (XSS) | High |
| [VULN-024](docs/vulnerabilities/VULN-024-idor-wishlist-userid.md) | 위시리스트 조회 IDOR (`userId` 신뢰) | both | A01 Broken Access Control | Medium |
| [VULN-025](docs/vulnerabilities/VULN-025-unrestricted-review-image-upload.md) | 후기 이미지 업로드 Content-Type 신뢰 → 저장형 XSS | both | A02 Misconfiguration | High |
| [VULN-026](docs/vulnerabilities/VULN-026-broken-access-control-secret-review.md) | 비밀 후기 본문 API 노출 (클라 마스킹만) | both + client | A01 Broken Access Control | Medium |
| [VULN-027](docs/vulnerabilities/VULN-027-order-option-not-validated.md) | 주문 옵션 값 미검증 | both | A06 Insecure Design | Low |
| [VULN-028](docs/vulnerabilities/VULN-028-stored-xss-login-log-user-agent.md) | 접속 로그 User-Agent 저장형 XSS (관리자 대상) | both + client | A05 Injection (XSS) | High |
| [VULN-029](docs/vulnerabilities/VULN-029-coupon-claim-no-dedup.md) | 쿠폰 중복 발급 (claim 검증 없음) | both | A06 Insecure Design | Low |
| [VULN-030](docs/vulnerabilities/VULN-030-point-balance-manipulation.md) | 포인트 사용 미검증 → 결제액/잔액 조작 | both | A06 Insecure Design | High |
| [VULN-031](docs/vulnerabilities/VULN-031-refund-access-control.md) | 반품/환불 접근제어·상태검증 누락 (IDOR + 이중환불) | both | A01 Broken Access Control | High |
| [VULN-032](docs/vulnerabilities/VULN-032-referral-reward-abuse.md) | 추천 보상 무한 적립 (멱등성·자기참조 미검증) | both | A06 Insecure Design | Medium |
| [VULN-033](docs/vulnerabilities/VULN-033-restock-callback-ssrf.md) | 재입고 알림 콜백 URL SSRF (응답 반환형) | both | A01 Broken Access Control (SSRF) | High |
| [VULN-034](docs/vulnerabilities/VULN-034-unauthenticated-openapi-docs.md) | 인증 없는 OpenAPI 명세·Swagger UI 노출 | both | A02 Misconfiguration | Low |
| [VULN-035](docs/vulnerabilities/VULN-035-stock-decrement-race.md) | 재고 차감 경쟁조건 (TOCTOU) → 초과판매 | both | A06 Insecure Design | High |
| [VULN-036](docs/vulnerabilities/VULN-036-coupon-redemption-reuse.md) | 쿠폰 사용(redemption) 재사용 (used 미확인) | both | A06 Insecure Design | Medium |
| [VULN-037](docs/vulnerabilities/VULN-037-shipment-tracking-idor.md) | 배송 조회 IDOR (순차 송장번호 + 무인증) → 구매자 PII | both | A01 Broken Access Control | High |
| [VULN-038](docs/vulnerabilities/VULN-038-predictable-order-share-token.md) | 예측 가능한 주문 공유 토큰 (`base64(orderId)`) | both | A04 Cryptographic Failures | High |

### OWASP Top 10:2025 커버리지

분류는 **OWASP Top 10:2025** 기준입니다. 2021 대비 주요 이동: SSRF(구 A10)는 A01로 편입,
Vulnerable/Outdated Components(구 A06)는 A03 Software Supply Chain Failures로 확장, Cryptographic
Failures A02→A04, Injection A03→A05, Security Misconfiguration A05→A02, Insecure Design A04→A06.

| OWASP 2025 카테고리 | VULN |
|---------------------|------|
| A01 Broken Access Control (IDOR·CSRF·SSRF 편입) | 003, 004, 009, 011, 013, 014, 024, 026, 031, 033, 037 |
| A02 Security Misconfiguration (XXE·파일 업로드 포함) | 007, 018, 020, 025, 034 |
| A03 Software Supply Chain Failures | 021 |
| A04 Cryptographic Failures | 038 |
| A05 Injection (SQLi·SpEL·NoSQL·OS Command·XSS) | 001, 002, 005, 008, 010, 016, 017, 019, 022, 023, 028 |
| A06 Insecure Design (비즈니스 로직·동시성 TOCTOU) | 015, 027, 029, 030, 032, 035, 036 |
| A07 Authentication Failures | 006 |
| A08 Software or Data Integrity Failures (역직렬화) | 012 |
| A09 Security Logging & Alerting Failures | — (Phase 4 탐지 단계에서 다룸) |
| A10 Mishandling of Exceptional Conditions | — (미해당) |

- 파일 업로드 → 저장형 XSS(018·025)는 설정 결함(A02)으로 분류하되 XSS 실행 표면을 겸합니다.
- A09·A10은 앱 취약점 스코프 밖 — A09는 관제/탐지(Phase 4, `infra/`)에서 다룹니다.

CLAUDE.md 스코프의 모든 앱 취약점 클래스가 최소 1개 이상 구현되어 있습니다.

> **익스플로잇 증명은 CTF식 플래그가 아니라 경로별로** 합니다 — 그 취약점을 통해서만 도달 가능한 것을
> 실제로 추출(예: SQLi로 `password_hash`, 커맨드 인젝션으로 환경변수, IDOR로 타인 주문)해 증거로 남깁니다.

---

## 저장소 구조

```
docker-compose.yml     # apps/* 를 격리 네트워크로 실행 (SIEM 스택은 infra/)
.env.example
apps/
  client/              # React + Vite 프런트엔드
  node-express/        # Node.js + Express WAS
  java-spring/         # Java + Spring Boot WAS
  nginx/               # 웹서버 계층 (리버스 프록시 + 정적 서빙)
docs/
  vulnerabilities/     # 취약점 명세 (git 추적, 공개)
  features/            # 기능 설계 문서 (git 추적, 공개)
  findings/            # Burp 진단 결과 (로컬 전용, gitignore)
  detection/           # 탐지 룰·런북 (로컬 전용, gitignore)
infra/                 # Wazuh/ELK 스택 (예정)
scripts/               # smoke.sh 등 보조 스크립트
```

- 기능 설계 인덱스: [`docs/features/README.md`](docs/features/README.md) (47개 기능 문서)
- 취약점 명세 인덱스: [`docs/vulnerabilities/README.md`](docs/vulnerabilities/README.md)

---

## 추적성 (Traceability)

각 취약점은 하나의 ID를 공유하며 다음 흐름을 관통합니다:

```
docs/vulnerabilities/VULN-NNN-*.md   (의도)
        └─▶ docs/findings/*.md       (Burp 진단, 로컬 전용)
                └─▶ 수정 커밋         (커밋 메시지에 VULN-NNN 참조)
                        └─▶ docs/detection/*.md   (탐지 룰, 로컬 전용)
```

`findings/`·`detection/`은 `.gitignore`로 제외되어 공개 저장소에는 포함되지 않습니다(로컬 전용 진단 산출물).

---

## 안전·법적 고지

이 프로젝트는 **보안 교육·연구 목적**으로만 제공됩니다. 여기 포함된 취약점과 익스플로잇 기법을 본인 소유가
아니거나 명시적 허가를 받지 않은 시스템에 사용하는 것은 불법이며, 그로 인한 결과의 책임은 사용자에게 있습니다.
저자·기여자는 오용에 대해 어떠한 책임도 지지 않습니다. 반드시 격리된 로컬 환경에서만 실행하세요.

---

## 라이선스

[MIT License](LICENSE) — 위 안전·법적 고지의 범위 안에서 자유롭게 사용·수정·배포할 수 있습니다.
