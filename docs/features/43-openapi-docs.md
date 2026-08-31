# 43. OpenAPI(Swagger) API 문서

브랜치: `feature/openapi-docs` · 관련 취약점: [VULN-034](../vulnerabilities/VULN-034-unauthenticated-openapi-docs.md)

## 무엇을 만들었나

- 양 스택에 Swagger UI + OpenAPI 명세. nginx 진입점(:8090) 기준 URL:
  - 인덱스: `/api-docs` (nginx 인라인 HTML, 양쪽 링크)
  - node: `/api-docs/node/` (UI), `/api-docs/node/openapi.json` (원본)
  - java: `/api-docs/java/swagger-ui.html` (UI), `/api-docs/java/v3/api-docs` (원본)
  - WAS 직접 접근도 동일 경로(`:3000/api-docs/node/`, `:8081/api-docs/java/swagger-ui.html`)
- node: 명세를 `apps/node-express/src/openapi/`에 **수기 작성**. `index.js` + `components.js` +
  `paths/*.js` 17개(`src/routes/`와 1:1). 66개 오퍼레이션(전체 86 − 관리자 20). **라우트 파일은 무변경.**
  `server.js`에 `swagger-ui-express` 마운트 3블록 추가(+`swagger-ui-express` 의존성).
- java: `springdoc-openapi-starter-webmvc-ui:2.6.0` 추가. `application.yml`에 `springdoc:` 블록,
  신규 `config/OpenApiConfig.java`(info / servers 2개 / `sessionCookie`(JSESSIONID) 스킴 /
  `/api` 프리픽스 제거 커스터마이저). 비관리자 컨트롤러 16개 + `vuln/CartImportController`에 `@Tag`,
  Auth·Product·Order·Profile에 `@Operation`·`@Parameter`·`@ApiResponse`(receipt HTML/plain), Profile·
  Point·Referral·Order에 클래스 레벨 `@SecurityRequirement`.
- `/api/admin/**` 제외: node는 명세 미기재, java는 `springdoc.paths-to-exclude`
  (`CatalogImportController`의 XXE 임포트 경로도 함께 빠짐).
- nginx: `/api-docs/*` location 7블록(URI 없는 `proxy_pass` + `proxy_redirect off`).
- `apps/client`: **0개 파일 변경** — 내비·푸터·사이트맵·라우트 어디에도 링크 안 함.
- `scripts/smoke.sh` +5 체크, `scripts/README.md`의 nginx 재빌드 문구 정정.

## 설계 판단

- **nginx 경로 = 백엔드 경로 동일 + URI 없는 `proxy_pass`.** 기존 `/api/node/` 방식(프리픽스 치환)을
  쓰면 `swagger-ui-express`의 상대 자산 경로와 springdoc이 서버에서 박아 넣는 **절대 `configUrl`**이
  nginx prefix 뒤에서 깨진다(404 → SPA catch-all이 `index.html`을 반환 → 빈 Swagger 화면). URI 없는
  `proxy_pass`는 경로를 그대로 넘겨 이 문제가 없고, `/api-docs/{stack}/` 아래만 백엔드에 도달한다.
- **`X-Forwarded-Proto https`는 문서 경로에 넘기지 않는다.** 이 헤더는 `/api/*` 전용(`Secure` 세션 쿠키용)이며,
  문서 경로에선 TLS 리스너 없는 `https://localhost:8090/...` 절대 URL을 만들 위험만 있다. `proxy_redirect off`는
  URI 없는 `proxy_pass`에서 nginx 기본값이 내부 호스트로 프리픽스를 중복 확장하는 것을 막는다.
- **스택별 네임스페이스 `/api-docs/{node,java}/`** — 백엔드 둘을 nginx 하나 뒤에 두므로 기본 경로 충돌을 피한다.
- **node 명세는 라우트 주석이 아닌 별도 모듈.** ① CLAUDE.md의 "코드 주석에 취약점 설명 금지" 규약 —
  `swagger-jsdoc`은 `@openapi` 블록을 SQLi/커맨드 인젝션 싱크 바로 위에 놓아 규약 위반으로 미끄러지기 쉽다.
  ② 라우트 파일 16개는 20개 이상 VULN 문서의 증거물이라 diff를 흐리고 싶지 않다. ③ 관리자 제외가
  "미기재"가 아니라 디렉터리 하나로 리뷰·테스트 가능해진다. ④ 부팅 시 glob/parse·런타임 의존성 1개 감소.
- **java 어노테이션은 최소.** 핸들러 다수가 `Map`/`ResponseEntity<?>` 반환이라 응답 스키마 자동 추론이
  안 되지만, 목적이 "오퍼레이션 인벤토리"라 경로·파라미터·요청 바디만으로 충분하다. **`Map` 핸들러를
  타입화하려고 DTO를 뽑지 않는다** — 그 `Map` 모양 자체가 VULN-013(대량 할당)의 의도된 동작이다.
- **path 키를 `/api` 제거 기준으로 두 스택 통일** → 두 명세의 `paths` 키 diff가 곧 two-stack mirror
  점검이 된다(현재 정확히 2건 비대칭: node 전용 `/activity`, java 전용 `/cart/import`).
- **관리자 제외는 경로 기준**이므로 사용자 프리픽스에 얹힌 관리자 오퍼레이션(`/coupons/manage`,
  `POST /faqs`, `PUT /returns/{id}/approve` …)은 명세에 남는다 — 의도한 결과이며 VULN-034의 핵심 페이로드.
- **Try it out CORS 비대칭**(server #2 = WAS 직접 포트: java는 통과, node는 `CORS_ORIGIN` 미설정으로 차단)은
  회피하지 않고 문서에 기록. node CORS를 넓히는 건 보안 관련 설정의 무관한 변경이라 하지 않는다.
- vite dev(:5173) 프록시에는 추가하지 않는다 — 노출을 운영형 진입점 하나로 한정.
- `swagger-ui-express`가 딸려 오는 `swagger-ui-dist`는 **의도된 취약 의존성이 아니다**(VULN-021과 혼동 금지).

## 이후 변경

- VULN-034를 의도적으로 남김: 인증 없이 도달 가능한 API 명세/Swagger UI.
- 탐색 중 발견한 VULN-007 문서의 잘못된 재현 경로(`GET /api/java/actuator/env`, nginx 프리픽스 치환으로
  실제로는 404)를 `GET http://localhost:8081/actuator/env`로 정정 — VULN-034와의 노출 경계 구분을 명확히.
