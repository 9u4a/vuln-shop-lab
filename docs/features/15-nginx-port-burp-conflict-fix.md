# 15. Nginx 포트가 Burp 기본 프록시와 충돌 — 수정

브랜치: `fix/nginx-port-burp-conflict`

## 무엇을 만들었나
- 문제: Nginx가 호스트 8080에 게시됐는데 Burp Suite 기본 프록시 리스너도 `127.0.0.1:8080`이라, 앱과 진단 도구가 같은 포트를 두고 충돌해 브라우저 트래픽이 Burp로 가지 않았다.
- 수정: `docker-compose.yml`에서 Nginx 공개 포트를 8080 → **8090**으로 이동. `CLAUDE.md`의 실행 안내도 갱신.
