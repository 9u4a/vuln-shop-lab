# 취약점 명세 (1단계 산출물)

`apps/node-express`, `apps/java-spring`에 의도적으로 심는 취약점을 여기에 하나씩 기록한다. 파일명은 `VULN-001-sql-injection-login.md` 형식으로 ID를 부여한다.

각 문서는 최소 다음을 포함한다:
- 어떤 스택(node-express / java-spring / both)에 심었는지
- OWASP 카테고리
- 어느 파일/엔드포인트에 있는지, 트리거 방법
- 대응하는 `docs/findings/`, `docs/detection/` 문서로의 링크(진단/탐지 단계에서 채워짐)

아직 등록된 취약점이 없다. 두 스택 모두 현재는 기능만 구현된 MVP 상태다.
