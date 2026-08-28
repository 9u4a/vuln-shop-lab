# Admin access logs & user activation (관리자 접속 로그 · 사용자 활성/비활성)

Branch: `feature/admin-access-logs` (base: `feature/cart-option-edit`)

관리자가 사용자 로그인 이력(성공/실패)을 열람하고, 사용자 계정을 활성/비활성 전환할 수 있게 한다.
비활성 계정은 로그인이 차단된다.

## 데이터 모델 (양 스택)

- `users` 컬럼 `active`(기본 true) 추가.
- `login_logs` 테이블: `id, user_id, username, ip, user_agent, success, at`.
  - node: `db.js` 테이블 + `active` guarded ALTER.
  - java: `entity/LoginLog.java` + `LoginLogRepository`, `User.active` 필드.

## 엔드포인트 (양 스택)

| 메서드 | 경로 | 접근 | 동작 |
|--------|------|------|------|
| POST | `/api/auth/login` | public | 성공·실패 모두 `login_logs` 기록. `active=0`이면 403 차단 |
| GET | `/api/admin/login-logs?username=&success=` | requireAdmin | 최근 200건(필터) |
| PUT | `/api/admin/users/:id/active` | requireAdmin | 활성/비활성 토글 |

로그인 기록: IP = `X-Forwarded-For`(없으면 remote addr), UA = `User-Agent` 헤더.
사용자 목록/상세 응답에 `active` 포함.

## 클라이언트

- `pages/admin/AdminAccessLogs.jsx` 신규 — `/admin/logs` 탭(`AdminLayout` TABS + `App.jsx` 라우트).
  시각/아이디/결과/IP/User-Agent 테이블 + 아이디·성공여부 필터.
- `AdminUsers.jsx` — "상태" 컬럼 + 활성/비활성 토글 버튼.
- `api.js` — `fetchLoginLogs`, `toggleUserActive`. `index.css` — `.badge-ok/.badge-danger`,
  `.access-log__ua`.

## 의도된 취약점 (VULN-028)

접속 로그 뷰어가 `user_agent`를 `dangerouslySetInnerHTML`로 렌더 → 공격자가 로그인 시
악성 `User-Agent` 헤더를 주입하면(실패해도 기록됨) 관리자가 로그 열람 시 **저장형 XSS** 실행.
A03 XSS. 문서: `docs/vulnerabilities/VULN-028-stored-xss-login-log-user-agent.md`.

> `login_logs`는 Phase 4(SIEM) 탐지 단계의 소재 — 로그인 실패 폭주/비정상 UA를 Wazuh 룰로
> 탐지하는 시나리오로 이어진다.

## 검증

- node `node -c`, java `docker compose build`, client `npm run build` 무오류.
- 클린 재시드 후 양 스택 **동일 결과**:
  - 로그인 성공/실패가 UA·IP와 함께 기록, `GET /admin/login-logs`에서 조회.
  - user3 비활성화 → 로그인 403, 재활성화 → 200.
  - VULN-028: `User-Agent: <img src=x onerror=...>`로 로그인 → 로그 응답에 페이로드 원문 저장.
