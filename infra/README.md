# 관제/대응 인프라 (4단계)

Wazuh + ELK 기반 SIEM을 이 디렉터리에 docker-compose로 구성할 예정이다.

## 계획

- Wazuh manager + indexer + dashboard
- `apps/node-express`, `apps/java-spring` 각 앱에 Filebeat/Wazuh agent를 붙여 애플리케이션 로그·접근 로그 수집
- `docs/findings/`의 공격 트래픽 패턴을 Wazuh 탐지 규칙(decoder/rule)으로 매핑, 결과를 `docs/detection/`에 기록

아직 미구성 상태. 1~2단계에서 취약점과 진단 결과가 충분히 쌓인 뒤 착수한다.
