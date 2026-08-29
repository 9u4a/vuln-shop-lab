# 35. 안정성 강화 (에러 경계 · 인프라 헬스체크 · 개발 편의)

브랜치: `feature/stability-hardening`

기능 34에서 미룬 나머지 안정성 항목을 마저 구현. 의도된 취약점은 전부 보존한다.

## 클라이언트 에러 처리

- **전역 ErrorBoundary**(`components/ErrorBoundary.jsx`): 렌더 예외로 앱 전체가 흰 화면이 되는 것을
  막고 "다시 시도" 안내를 표시. `App.jsx`의 `<main>`에서 라우트를 감싼다.
- **Products / ProductDetail 에러 처리**: `fetchProducts`·`fetchProduct`에 `.catch()`가 없어
  네트워크 오류·500 시 스켈레톤/"불러오는 중"이 무한 표시되던 문제 해결 — 에러 배너로 전환하고
  stale 응답 가드(`active` 플래그)도 추가.
- **쓰기 버튼 중복 제출 방지**: 결제(`Cart.jsx` handleCheckout/handlePay — 중복 주문 위험),
  로그인, 회원가입에 `busy` 상태 추가(진행 중 버튼 비활성 + "처리 중…"). 서버측 검증 미비
  (VULN-015 등)는 그대로 두어 API 레벨 재현 경로를 막지 않는다.

## 인프라 안정성

- **docker-compose 헬스체크 + 의존 조건**: node(`/api/session`)·java(`/actuator/health`)·
  mongo(`ping`)에 healthcheck, `restart: unless-stopped`, nginx·client는
  `depends_on: condition: service_healthy`. 백엔드가 준비된 뒤에야 진입점이 뜨므로 **기동 직후
  502가 사라진다**(검증: nginx/client가 java/node Healthy 이후 Started).
- **Mongo 초기 연결 재시도**(`mongo.js`): `initMongo`가 최대 10회·3초 간격으로 재시도, 실패 시
  로그만 남기고 앱은 계속 뜬다(활동 피드만 503). NoSQLi(VULN-022) 쿼리는 미변경.
- **Java @ColumnDefault 보강**: `Event.active`·`LoginLog.success`에 누락돼 있던 `@ColumnDefault`
  추가 — 기존 `java_data` 볼륨에서 `ddl-auto` 컬럼 추가 실패로 기동이 깨지는 함정 차단(나머지
  NOT NULL 컬럼은 이미 적용돼 있었음).
- **nginx 강화**(`nginx.conf`): gzip(JS/CSS/JSON), `/assets` 장기 캐시(immutable), 502/503/504
  안내 페이지(`error_page`), proxy connect/read 타임아웃 단축(60s→5/30s).

## 개발 편의

- `scripts/smoke.sh` — 기동 후 양 스택이 :8090으로 응답하는지 일괄 확인. `scripts/README.md`에
  reseed/단일 서비스 재빌드/로그 등 자주 쓰는 명령 정리.
- `.env.example`(루트·node) 보강 — `MONGO_URL`·`CORS_ORIGIN`·`APP_CORS_ALLOWED_ORIGIN` 문서화.

## 취약점 보존

- VULN-007: 커스텀 에러 핸들러 미추가 → dev 스택트레이스 노출 유지(검증에서 재확인).
  actuator를 java 헬스체크에 쓰지만, 이는 이미 노출돼 있던 엔드포인트라 표면 변화 없음.
- `dangerouslySetInnerHTML`·비밀글 마스킹·`?userId=` IDOR·서버측 미검증 전부 미변경.

## 검증

- node `-c`, `docker compose config` 유효, java 빌드 OK, client `npm run build` OK.
- `docker compose up --build -d` → node/java/mongo Healthy, nginx/client가 그 이후 기동.
- `bash scripts/smoke.sh` → 양 스택 전 항목 200(+ activity 401) **SMOKE PASS**.
- gzip(`Content-Encoding: gzip`)·`/assets` 캐시(`max-age`, immutable) 확인.
- **VULN-007 재확인**: 잘못된 JSON POST 응답에 스택트레이스 그대로 포함.
