# 05. 상품 검색 · 카테고리 필터 · 정렬 (의도적 취약)

브랜치: `feature/search-filters` · 관련 취약점: VULN-001, VULN-002

## 무엇을 만들었나
- `GET /api/products`가 기존 `q`에 더해 `category`·`sort`를 받음.
- 클라이언트 `Products`: 카테고리 필터 + 정렬 드롭다운, `sort` 활성 시 상품별 `sortKey` 디버그 줄 노출(java 익스플로잇 표면 — "디버그 필드를 남긴" 현실적 버그 재현).

## 의도된 취약점
- **VULN-001 (node)**: `q`/`category`/`sort`를 파라미터 바인딩 없이 SQL에 직접 결합 — UNION SELECT로 타 테이블 덤프.
- **VULN-002 (java)**: `sort`를 SpEL 표현식으로 평가해 결과를 `sortKeys`에 반환 — `T(...)` 타입 참조로 임의 정적 메서드 호출(RCE 원시).

## 설계 판단
- 이 기능은 지시에 따라 처음부터 의도적으로 취약하게 구현하고 즉시 문서화. CTF식 flag는 두지 않음 — 한 번의 SQLi로 flag 테이블이 통째로 덤프돼 특정 취약점 증명이 되지 않기 때문(`CLAUDE.md`의 증거 원칙).
- 상세 페이로드·영향은 VULN 문서에만 기록(중복 금지).

## 이후 변경
- 의류 전환(26)에서 필터 파라미터 `gender/color/material`이 추가되며 VULN-001/005 인젝션 표면이 확장됨.
