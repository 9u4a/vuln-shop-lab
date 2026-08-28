# 18. 취약점 인덱스 + 스코프 커버리지 정비 (chore)

브랜치: `chore/vuln-index-refresh`

## 무엇을 만들었나
- 문제: `docs/vulnerabilities/README.md`가 "아직 등록된 취약점 없음"인 채였고, 실제 인덱스는 `docs/features/17`의 표에만 있었다. OWASP 스코프 커버리지도 한눈에 볼 곳이 없었다.
- 변경: `README.md`를 라이브 인덱스로 재작성 — VULN별 1행(구현·계획) + 스코프 커버리지 매트릭스(DONE/PLANNED). `CLAUDE.md` 취약점 스코프에 NoSQLi/XXE/대량 할당/CSRF/비즈니스 로직을 명시하고 인덱스 포인터 추가.
- 코드 변경 없음. 이 문서가 먼저 병합돼 이후 VULN-013~022는 인덱스에 행만 추가하면 됨.

## 이후 변경
- 예고했던 VULN-013~022 배치는 19~23에서 모두 구현 완료.
