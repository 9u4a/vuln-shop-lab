# VULN-006 세션 고정 + 로그인 시도 제한 없음

- 대상 스택: node-express, java-spring (동일)
- 심각도: Medium
- 분류: A07:2025 Authentication Failures

## 위치

- `apps/node-express/src/routes/auth.js`, `POST /api/auth/login` — 로그인 성공 시 `req.session.regenerate()` 없이 기존 세션 객체에 `req.session.user = {...}`만 설정.
- `apps/java-spring/src/main/java/com/vulnlab/shop/controller/AuthController.java`, `POST /api/auth/login` — 마찬가지로 `session.setAttribute("user", ...)`만 하고 세션 ID를 재발급하지 않음.
- 두 스택 모두 로그인 시도 횟수 제한/지연/lockout이 전혀 없음.

## 트리거 방법

1. 로그인 전 `/api/session` 등으로 세션 쿠키 발급받아 고정.
2. 그 쿠키를 유지한 채 로그인 성공시킨 뒤, 동일 쿠키로 인증된 API(`/api/profile` 등) 호출 → 200 확인 (세션 ID 불변 = 고정 가능).
3. `/api/auth/login`에 동일 계정으로 반복 POST — 429/lockout 없이 무제한 재시도 확인.

## 영향

- 세션 고정: 로그인 전 공격자가 피해자에게 심어둔 세션 쿠키가 로그인 후에도 그대로 유효 — 피해자가 로그인하면 공격자가 쥔 동일 세션 쿠키로 인증된 상태에 접근 가능.
- 무제한 로그인 시도로 인해 약한 비밀번호(`user1`/`user1` 등 시드 계정) 브루트포스 가능.

## 증거 (재현 확인)

(진단 단계에서 채움) — Phase 2(Burp 진단)에서 재현 예정.

## 조치 상태: 미조치 (의도된 취약점)
