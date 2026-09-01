# VULN-012 장바구니 임포트 Jackson 역직렬화

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A08:2025 Software or Data Integrity Failures (Insecure Deserialization, CWE-502)

**장바구니 공유** 기능의 "공유 코드로 가져오기" 경로에 있다. 사용자가 장바구니를 base64 공유 코드로
내보내고(`GET /api/cart/share`), 다른 사용자가 그 코드를 붙여넣어 자기 장바구니로 가져온다
(`POST /api/cart/import`). 코드를 base64 디코드해 나온 JSON을 별도 `ObjectMapper`로 역직렬화하는데,
`activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ...)`로 Jackson의 서브타입 검증을 완전히
무력화하여 코드 안에 지정된 임의 클래스를 인스턴스화하도록 허용한다. 내보내기/가져오기가 같은 typed 포맷을
쓰므로 정상 왕복은 잘 동작하고(친구 장바구니 담기), 바로 그 경로가 역직렬화 표면이 된다.

`apps/java-spring/src/main/java/com/vulnlab/shop/vuln/CartImportController.java` — 공유·가져오기가 여기
격리되어 있고, Node 스택(`routes/cart.js`)은 같은 기능을 **안전한 `JSON.parse`**로 구현해 취약하지 않다.

```java
ObjectMapper mapper = new ObjectMapper();
mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance, ObjectMapper.DefaultTyping.NON_FINAL);
String json = new String(Base64.getDecoder().decode(code), StandardCharsets.UTF_8);
List<?> items = mapper.readValue(json, List.class);
```

의도적으로 `pom.xml`의 전역 `jackson-databind` 버전은 낮추지 않았다 — Spring Boot 3.3 parent BOM이 `jackson-core`/`jackson-annotations`/`jackson-databind`를 함께 관리하므로 databind만 구버전(예: 2.9.8)으로 pin하면 세 아티팩트 버전이 어긋나 앱 전체의 JSON 직렬화가 깨질 위험이 크다. `LaissezFaireSubTypeValidator`를 명시적으로 사용하는 것만으로 Jackson 버전과 무관하게 동일한 CWE-502 취약점(신뢰 경계 없는 타입 결정)이 재현되므로, 이 방식으로 다른 엔드포인트에 영향을 주지 않고 격리했다.

## 트리거 방법

악성 typed JSON을 base64로 인코딩해 공유 코드로 위장한 뒤 `code`에 넣는다. `readValue(json, List.class)`
이므로 **루트는 List 타입 id**(`java.util.ArrayList`)여야 하고, gadget은 **원소(Object 슬롯)** 로 지정한다.

```
# 임의 타입 인스턴스화(원소 Object 슬롯):
# payload = ["java.util.ArrayList",[["<클래스명>","<문자열 인자>"]]]
# code = base64(payload)
POST /api/cart/import
{"code":"WyJqYXZhLnV0aWwuQXJyYXlMaXN0IixbWyJqYXZhLmlvLkZpbGUiLCIvdG1wL3B3biJdXV0="}
```

정상 코드(`GET /api/cart/share`가 만든 코드)는 상품 항목 배열이라 그대로 장바구니에 담긴다.

**Jackson 버전 주의**: Spring Boot 3.3의 jackson-databind(2.17)에는 `LaissezFaireSubTypeValidator`로도
못 끄는 **내장 블록리스트**가 있어, `FileSystemXmlApplicationContext`/`JdbcRowSetImpl` 등 잘 알려진
RCE gadget은 `"prevented for security reasons"`(`InvalidDefinitionException`)로 차단된다. 따라서 이
설정으로 확인되는 것은 **신뢰 경계 없는 default typing → 블록리스트 밖 임의 클래스 인스턴스화(CWE-502)**
이며, 실제 RCE는 블록리스트에 없는 gadget이 classpath에 있어야 성립한다.

## 영향

- 신뢰 경계 없는 타입 결정(CWE-502)으로 임의 클래스 인스턴스화 — 적절한 gadget 체인과 결합 시 RCE.

## 증거 (재현 확인)

2026-09-01, 로컬 재현: `["java.util.ArrayList",[["java.io.File","/tmp/pwn-marker"]]]`를 base64로
`POST /api/cart/import`에 보내면 예외 없이 `{"itemCount":0}`(File은 장바구니 항목이 아니라 무시) — **공유
코드 내 타입 id로 임의(비블록리스트) 클래스가 인스턴스화됨**을 확인. 반면 블록리스트 gadget
(`FileSystemXmlApplicationContext`)은 `InvalidDefinitionException: ... prevented for security reasons`로
차단됨(jackson 2.17 내장 방어). 정상 왕복(`/cart/share`→`/cart/import`)은 상품이 그대로 복원됨.

## 조치 상태: 미조치 (의도된 취약점)
