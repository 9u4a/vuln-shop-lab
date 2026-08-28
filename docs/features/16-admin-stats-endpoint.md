# 16. 관리자 통계 엔드포인트 (리팩터)

브랜치: `refactor/admin-stats-endpoint`

## 무엇을 만들었나
- 문제: 관리자 개요(`AdminSettings`)가 개수 5개를 얻으려고 5개 테이블 전체를 병렬 조회해 `.length`만 쓰고 버렸다 — 테이블이 커질수록 비용 증가.
- 수정: `GET /api/admin/stats`(양 스택, 관리자 게이트) 신설 — `COUNT(*)`/`JpaRepository.count()`로 `{users,orders,products,faqs,notices}` 개수만 반환. `AdminSettings`가 이 단일 호출로 전환.

## 이후 변경
- 이후 events·coupons·questions·likes·login_logs 테이블이 추가됐으나(25/27/30/31/32) 이 통계 필드에는 반영돼 있지 않음(개요 카드 한정).
