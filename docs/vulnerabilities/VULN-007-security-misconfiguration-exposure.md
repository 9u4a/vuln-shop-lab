# VULN-007 Security misconfiguration: exposed diagnostics

- 대상 스택: node-express, java-spring
- 심각도: Medium
- 분류: A05:2021 Security Misconfiguration

## 위치

- **java-spring**: `pom.xml`에 `spring-boot-starter-actuator` 추가, `application.yml`에 `management.endpoints.web.exposure.include: "*"` — 인증 없이 `/actuator/env`(환경변수, `TOSS_SECRET_KEY` 등), `/actuator/heapdump`, `/actuator/beans` 등 전체 actuator 엔드포인트 노출. Spring Security 자체가 앱에 없어(별도 확인) 접근 제어 수단이 없다.
- **node-express**: `NODE_ENV`가 어디에도 설정돼 있지 않아(Dockerfile/.env.example 모두 미설정) Express가 기본값 `development`로 동작 — 미처리 예외 발생 시 내장 에러 핸들러가 응답 본문에 스택트레이스를 그대로 포함.

## 트리거 방법

```
GET /api/java/actuator/env
GET /api/java/actuator/heapdump
```

Node는 서버 에러를 유발하는 요청(예: 잘못된 타입의 바디로 미처리 라우트 호출) 후 응답 바디에 스택트레이스 포함 여부 확인.

## 조치 상태: 미조치 (의도된 취약점)
