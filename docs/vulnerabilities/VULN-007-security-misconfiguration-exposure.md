# VULN-007 진단 엔드포인트 노출 (actuator 전체 / dev 스택트레이스)

- 대상 스택: node-express, java-spring
- 심각도: Medium
- 분류: A02:2025 Security Misconfiguration

## 위치

- **java-spring**: `pom.xml`에 `spring-boot-starter-actuator` 추가, `application.yml`에 `management.endpoints.web.exposure.include: "*"` — 인증 없이 `/actuator/env`(환경변수, `TOSS_SECRET_KEY` 등), `/actuator/heapdump`, `/actuator/beans` 등 전체 actuator 엔드포인트 노출. Spring Security 자체가 앱에 없어(별도 확인) 접근 제어 수단이 없다.
- **node-express**: `NODE_ENV`가 어디에도 설정돼 있지 않아(Dockerfile/.env.example 모두 미설정) Express가 기본값 `development`로 동작 — 미처리 예외 발생 시 내장 에러 핸들러가 응답 본문에 스택트레이스를 그대로 포함.

## 트리거 방법

```
GET http://localhost:8081/actuator/env
GET http://localhost:8081/actuator/heapdump
```

주의: nginx(`:8090`)의 `location /api/java/`는 `proxy_pass ... /api/`로 프리픽스를 치환하므로
`/api/java/actuator/env`는 백엔드에서 `/api/actuator/env`가 되어 404다. actuator는 `context-path`가 없어
루트(`/actuator/**`)에 있으므로, 이 표면은 **WAS 포트(`:8081`)에 직접 접근할 수 있을 때만** 유효하다
(nginx 공개 진입점으로 도달하는 [[VULN-034-unauthenticated-openapi-docs]]와 노출 경계가 다르다).

Node는 서버 에러를 유발하는 요청(예: 잘못된 타입의 바디로 미처리 라우트 호출) 후 응답 바디에 스택트레이스 포함 여부 확인.

## 영향

- 인증 없이 `/actuator/env`·`/actuator/heapdump`로 환경변수(`TOSS_SECRET_KEY` 등)·힙 덤프 열람 → 시크릿 유출. Node의 dev 스택트레이스는 내부 경로·의존성·코드 구조를 노출해 후속 공격의 정찰 정보를 제공한다.

## 증거 (재현 확인)

(진단 단계에서 채움) — Phase 2(Burp 진단)에서 재현 예정.

## 조치 상태: 미조치 (의도된 취약점)
