# 08. 역할 3단계(user/admin/system_admin) + FAQ

브랜치: `feature/role-tiers-and-faq`

## 무엇을 만들었나
- 역할 3단계(양 스택): 최초 가입자가 `system_admin`(기존 admin), 이후 `user`.
  - `requireAdmin`은 `admin` 또는 `system_admin` 허용, 신규 `requireSystemAdmin`은 `PUT /api/admin/users/:id/role`(승격·강등)에만 적용 — 역할 변경은 system_admin 전용.
  - java: 역할 상수·검사를 `security/Roles`로 추출해 컨트롤러 공유.
- FAQ: `faqs` 테이블, `GET /api/faqs`(공개), `POST/PUT/DELETE`(requireAdmin). 클라이언트 `/faq` + 관리자 FAQ 관리.

## 설계 판단
- "콘텐츠 관리(admin)"와 "권한 통제(system_admin)"를 분리 — 일반 admin이 스스로/타인을 승격할 수 있으면 계층 의미가 사라진다.
- 역할은 로그인 시점에 세션 캐시되므로 승격·강등은 재로그인 후 반영(테스트 시 버그로 오인 주의).

## 이후 변경
- FAQ 작성 권한은 12에서 전체 로그인 사용자로 개방됐다가, 32에서 다시 관리자 전용 게시판으로 환원. Q&A 문의 게시판은 32에서 별도 신설.
