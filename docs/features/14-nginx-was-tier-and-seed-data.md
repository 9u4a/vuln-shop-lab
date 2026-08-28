# 14. Nginx 웹서버 계층 + 데모 시드 데이터 보강

브랜치: `feature/nginx-was-tier-and-seed-data`

## 무엇을 만들었나
- Nginx(웹서버) → WAS 2계층:
  - `apps/nginx/Dockerfile` — 멀티스테이지(클라이언트 `vite build` 시 `VITE_TOSS_CLIENT_KEY` build arg로 주입 → `nginx:1.27-alpine`).
  - `apps/nginx/nginx.conf` — 빌드된 클라이언트 정적 서빙(SPA 폴백), `/api/node/*`→`node-express:3000/api/*`·`/api/java/*`→`java-spring:8081/api/*`·`/uploads/*` 리버스 프록시. `client_max_body_size 5m`.
  - `docker-compose.yml`에 `nginx` 서비스(리포 루트 컨텍스트), 루트 `.dockerignore` 추가.
- 시드 데이터 보강(사용자 직접 작성): 사용자 5(9u4a/admin/user1~3), 상품 10, FAQ 5, 공지 4, 리뷰 9, 주문 4 — 전부 멱등(`COUNT(*)==0`/`findByUsername` 검사).

## 이후 변경
- Nginx 공개 포트는 8080→8090으로 이동(15, Burp 충돌 회피). 이 10종 테크 가젯 시드는 26에서 16종 의류 카탈로그로 전면 재시드.
