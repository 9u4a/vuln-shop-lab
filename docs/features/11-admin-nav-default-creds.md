# 11. 관리자 네비 복구 + 기본 관리자 계정 시드

브랜치: `feature/admin-nav-default-creds`

## 무엇을 만들었나
- 관리자 네비 링크 복구(역할 게이트): `user.role`이 `admin`/`system_admin`일 때만 표시(`ADMIN_ROLES.includes`) — 서버 검사·`RequireRole` 가드와 동일 조건. 10에서 완전히 숨겼던 것을 원래의 역할 기반 표시로 되돌림.
- 기본 `system_admin` 계정 시드(양 스택, `9u4a`/`9u4a`): 기동 시 동일 username이 없으면 1회 생성(node `db.js` bcryptjs, java `DataSeeder`). 이 계정이 이미 존재하므로 "최초 가입자=system_admin" 부트스트랩은 사실상 발동하지 않음(첫 사람 가입자는 `user`).

## 설계 판단
- 이 계정은 데모 앱 운용용 자체 관리자 로그인이며 테스트로 발견된 결함이 아니므로 취약점으로 추적하지 않음.
- 실제 접근 제어는 `RequireRole`(클라)·서버 역할 검사이며, 네비 링크는 표시용 — 링크를 숨겨도 직접 URL 접근은 여전히 403.
