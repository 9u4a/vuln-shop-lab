# VULN-003 Default admin credentials (하드코딩된 기본 관리자 계정)

- 대상 스택: node-express, java-spring (동일)
- 심각도: Critical
- 분류: A05:2021 Security Misconfiguration (Default Credentials)

## 위치

- `apps/node-express/src/db.js` — 앱 시작 시 `users` 테이블에 `9u4a` 계정이 없으면 자동으로 생성.
- `apps/java-spring/src/main/java/com/vulnlab/shop/config/DataSeeder.java` — `seedDefaultAdmin()`, 동일한 조건으로 동일 계정 생성.

두 스택 모두 최초 기동(빈 DB) 시 다음 계정이 `system_admin` 권한으로 자동 생성된다.

```
username: 9u4a
password: 9u4a
```

## 트리거 방법

```
POST /api/auth/login
{"username": "9u4a", "password": "9u4a"}
```

로그인 성공 시 `system_admin` 세션을 즉시 획득 — 회원가입 없이 최고 권한 계정에 접근 가능.

## 영향

- `system_admin`은 사용자 role 변경(`PUT /admin/users/:id/role`)을 포함한 모든 관리자 기능에 접근 가능.
- "첫 회원가입자가 system_admin이 된다"는 기존 부트스트랩 로직과 별개로, 이 계정이 이미 존재하므로 공격자가 회원가입 타이밍을 다툴 필요 없이 항상 재현 가능한 진입점이 된다.

## 증거 (재현 확인)

2026-08-25, 신규 볼륨으로 `docker compose up --build` 후 두 스택 모두에서 `9u4a`/`9u4a` 로그인 → `{"user":{"...,"role":"system_admin"}}` 응답 확인, 이후 `/admin/*` 관리자 API 정상 호출 확인.

## 조치 상태: 미조치 (의도된 취약점 — 조치하지 않음)
