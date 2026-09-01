# VULN-006 세션 고정 + 로그인 시도 제한 없음

- 대상 스택: node-express, java-spring (동일)
- 심각도: Medium
- 분류: A07:2025 Authentication Failures

## 위치

- `apps/node-express/src/routes/auth.js`, `POST /api/auth/login` — 로그인 성공 시 `req.session.regenerate()` 없이 기존 세션 객체에 `req.session.user = {...}`만 설정.
- `apps/java-spring/src/main/java/com/vulnlab/shop/controller/AuthController.java`, `POST /api/auth/login` — 마찬가지로 `session.setAttribute("user", ...)`만 하고 세션 ID를 재발급하지 않음.
- 두 스택 모두 로그인 시도 횟수 제한/지연/lockout이 전혀 없음.

## 트리거 방법

**세션 고정 (java만 직접 성립)**
1. 로그인 전 `GET /api/java/session`으로 `JSESSIONID` 발급받아 고정.
2. 그 쿠키를 유지한 채 로그인 성공 → 로그인 응답이 `JSESSIONID`를 **재발급하지 않음**.
3. 동일(고정) 쿠키로 `GET /api/java/session` → 로그인된 사용자로 인증됨.

> **node 재현 제약**: express-session이 `saveUninitialized:false`(`server.js:54`)라 로그인 전
> `GET /api/node/session`은 **쿠키를 심지 않는다**(익명 세션 미저장). 즉 "미리 고정할 쿠키"가 없어
> 문서적 세션 고정 시나리오가 node에서는 성립하지 않는다(로그인 시 새 `connect.sid` 발급). node의
> A07 표면은 아래 무잠금 브루트포스 쪽이다.

**무잠금 브루트포스 (양 스택)**: `POST /api/{stack}/auth/login`에 반복 POST — 시도 제한/지연/lockout이
없어 약한 시드 비밀번호(`user1/user1` 등) 대입 가능.

## 영향

- (java) 세션 고정: 공격자가 심어둔 세션 쿠키가 로그인 후에도 유효 — 피해자 로그인 시 동일 세션 탈취.
- (양 스택) 무제한 로그인 시도로 약한 비밀번호 브루트포스.

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`): java — 로그인 전 `GET /api/java/session`이 `JSESSIONID` 발급, 그 쿠키로
로그인 후 응답에 새 `JSESSIONID` 없음(재발급 X), 동일 고정 쿠키로 `GET /api/java/session`이 `user1`로
인증됨 → 세션 고정 확인. node — 로그인 전 `GET /api/node/session`은 `Set-Cookie` 없음(고정용 쿠키 부재)
→ 문서적 고정 미성립(무잠금 브루트포스만 해당). 무잠금은 양쪽 모두 lockout/429 없음.

## 조치 상태: 미조치 (의도된 취약점)
