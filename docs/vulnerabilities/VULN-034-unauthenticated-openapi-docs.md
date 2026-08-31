# VULN-034 인증 없는 OpenAPI 명세 · Swagger UI 노출 (API 인벤토리)

- 대상 스택: node-express, java-spring
- 심각도: Low
- 분류: A05:2021 Security Misconfiguration (CWE-651, CWE-200)

## 위치

**개발자 편의용으로 붙인 API 문서(Swagger UI + OpenAPI 명세)가 운영형 진입점(nginx :8090)에
인증·프로파일 분기 없이 그대로 노출**된다. 클라이언트 내비게이션·푸터·사이트맵 어디에도 링크되어
있지 않지만 URL을 직접 입력하면 누구나 열람할 수 있다.

- node: `apps/node-express/src/server.js` — `/api-docs/node`(Swagger UI), `/api-docs/node/openapi.json`.
  명세는 `apps/node-express/src/openapi/`에 수기 작성(라우트 파일과 1:1). 접근 게이트 없음.
- java: `apps/java-spring/src/main/resources/application.yml`의 `springdoc:` 블록 +
  `.../config/OpenApiConfig.java` — `/api-docs/java/swagger-ui.html`(UI), `/api-docs/java/v3/api-docs`(명세).
  Spring Security가 앱에 없어 springdoc 경로를 막을 수단 자체가 없다.
- nginx: `apps/nginx/nginx.conf`의 `/api-docs/*` location 블록이 이 경로를 백엔드로 프록시한다.
- `/api/admin/**`는 명세에서 제외(node는 미기재, java는 `springdoc.paths-to-exclude`)했으나, 이는
  은폐일 뿐 접근 제어가 아니다 — 제외된 경로도 여전히 `:8090`에서 응답한다.

## 트리거 방법

```
GET http://localhost:8090/api-docs
GET http://localhost:8090/api-docs/node/openapi.json
GET http://localhost:8090/api-docs/java/v3/api-docs

→ 로그인 없이 200. 두 JSON을 Burp Suite(OpenAPI 파서)/Postman에 임포트하면
  66개(node)/47개(java) 오퍼레이션이 경로·메서드·파라미터·요청 스키마까지 갖춰진
  즉시 요청 가능한 형태로 재구성된다.
```

`:8090`에서 정상 로그인한 뒤 같은 브라우저로 `/api-docs/node/`(또는 java UI)를 열면 세션 쿠키가 실려
Swagger UI "Try it out"으로 인증 오퍼레이션까지 실행된다(server 드롭다운 #1 = `/api/node` · `/api/java`).

## 영향

- 인증 없이 전체 오퍼레이션의 경로·메서드·파라미터 이름/타입을 획득 → 파라미터 퍼징 대상이 추측이
  아니라 **명세로** 주어진다 (VULN-001/005의 `q`·`sort`·`category`·`gender`…, VULN-022의 활동 피드 `username`).
- 오퍼레이션별 `security` 표기로 **어디가 인증 없이 열려 있는지**가 그대로 드러난다 → BOLA/IDOR
  후보(VULN-003, 024, 026, 031) 선별 비용이 사실상 0.
- UI에서 도달 경로가 전혀 없는 **`POST /api/java/cart/import`**(인증 없음, Jackson polymorphic 역직렬화
  싱크, VULN-012)가 명세에 공개된다. 이전엔 소스 리뷰나 경로 추측으로만 발견 가능했다.
- 관리자 전용이지만 사용자 프리픽스에 얹힌 오퍼레이션(`/coupons/manage`, `POST|PUT|DELETE /faqs`,
  `PUT /notices/{id}`, `PUT /qna/{id}/answer`, `GET /returns`, `PUT /returns/{id}/approve`,
  `POST /restock/notify/{productId}` 등)이 목록화된다 — 비인증 독자에게 "권한 있는 오퍼레이션이
  권한 없는 프리픽스에 숨어 있는 지도"를 발행하는 셈.

※ **VULN-007(진단 엔드포인트 노출)과의 구분** — 같은 A05지만 셋 다 다르다.
1. **유출물**: 007은 *런타임 내부 상태*(actuator `/env`의 `TOSS_SECRET_KEY`, `/heapdump`, `/beans`,
   Express dev 스택트레이스). 034는 *애플리케이션 API 인벤토리*(경로·파라미터·오퍼레이션별 인증 요구 여부).
   겹치는 데이터가 없다.
2. **노출 경계(결정적)**: nginx의 `location /api/java/`는 `proxy_pass http://java-spring:8081/api/`로
   프리픽스를 **치환**하므로 `/api/java/actuator/env`는 백엔드에서 `/api/actuator/env` → 404다.
   **007의 actuator 표면은 nginx 진입점(:8090)으로 도달하지 않으며, WAS 포트(:3000/:8081)에 직접
   접근할 수 있는 공격자에게만 유효**하다. 034는 반대로 nginx 공개 진입점에 노출되어 외부 공격자가
   첫 요청으로 도달한다.
3. **조치가 서로를 고치지 못함**: 007의 정상 구현(actuator `include: health,info` + `NODE_ENV=production`)을
   적용해도 `/api-docs/*`는 그대로 열려 있고, 034를 막아도 `:8081/actuator/env`는 그대로다.

**심각도를 Low로 둔 근거**: 명세 자체는 자격증명·PII·시크릿을 담지 않고, 명세에 실린 엔드포인트는
모두 원래부터 `:8090`에서 도달 가능하던 것이다. 새로 열린 접근 권한은 없고 **정찰 비용만** 낮춘다.
저장소 기준선으로도 실제로 `TOSS_SECRET_KEY`가 유출되는 VULN-007이 Medium이므로, 그보다 적게
흘리는 이 항목이 Medium을 넘을 수 없다. 단순 Informational이 아닌 이유는 위 영향 2·3번.

## 증거 (재현 확인)

(진단 단계에서 채움) — Phase 2(Burp 진단)에서 재현 예정.
예정 증거: 두 명세의 `paths` 키/오퍼레이션 개수, `/cart/import`가 명세에 존재함을 보이는 발췌,
Burp Target 사이트맵에 임포트로 채워진 항목 수.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 명세 생성 자체는 개발/CI 산출물로 유지하되 **배포 런타임에서 비활성화**한다 —
java는 `springdoc.api-docs.enabled: false`(운영 프로파일), node는 프로파일 분기로 `/api-docs` 라우트
미마운트. 또는 인증·사내망 뒤로 이동(리버스 프록시 IP allowlist·SSO). 최소한 리버스 프록시에서
`/api-docs`·`/v3/api-docs`·`/swagger-ui`를 차단한다. 더불어 문서화되지 않은 관리자 오퍼레이션이
사용자 프리픽스에 섞이지 않도록 경로 설계를 `/api/admin/**`로 일원화한다.

관련: [[VULN-007-security-misconfiguration-exposure]], [[VULN-012-insecure-deserialization-cart-import]],
[[VULN-001-sql-injection-product-search-node]], [[VULN-022-nosql-injection-activity]],
[[VULN-003-qna-secret-question-access-control]]
