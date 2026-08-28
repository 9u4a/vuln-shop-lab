# 04. 관리자 패널

브랜치: `feature/admin-panel`

## 무엇을 만들었나
- 관리자 부트스트랩: 백엔드별 최초 가입자가 자동으로 `role=admin`, 이후는 `user`.
- `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `GET /api/admin/orders`(전체 주문), `POST/PUT/DELETE /api/admin/products`(상품 CRUD).
- 전부 `requireAdmin`(node)·세션 역할 검사(java)로 가드 — 비로그인 401, 비관리자 403.
- 클라이언트: `/admin` 페이지(사용자·역할, 전체 주문, 상품 관리). "관리자" 네비 링크는 클라이언트 표시용일 뿐, 실제 경계는 서버 검사.

## 설계 판단
- "최초 가입자=관리자"는 단일 인스턴스 최초 관리자 확보 패턴(WordPress/Grafana 류)일 뿐 취약점이 아니다. 이후의 약한/기본 자격증명 취약점과는 별개.

## 이후 변경
- 역할 3단계로 확장되며 최초 가입자=`system_admin`으로 변경(08), 이어 기본 `9u4a` 계정 시드(11)로 이 부트스트랩 경로는 사실상 비활성. `/admin`은 서브페이지로 분리(09).
