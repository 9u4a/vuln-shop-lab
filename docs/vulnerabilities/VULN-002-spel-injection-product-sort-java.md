# VULN-002 상품 정렬 파라미터 SpEL 인젝션

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
GET /api/products?sort=T(System).getenv('HOSTNAME')
```

`sortKeys`에 컨테이너 호스트네임이 그대로 노출된다. **동일한 방식으로 `TOSS_SECRET_KEY` 등 이 컨테이너에 실제로 주입된 시크릿도 그대로 읽을 수 있다** — 재현 시에는 실제 배포 시크릿을 노출시키지 않기 위해 `HOSTNAME`처럼 민감하지 않은 값으로만 검증했다.

동일한 원리로 임의 코드 실행까지 가능하다 (실제 실행은 하지 않았음 — PoC만 남김):

```
sort=new java.util.Scanner(T(java.lang.Runtime).getRuntime().exec("id").getInputStream()).useDelimiter("\A").next()
```

## 영향

- 환경변수/시스템 프로퍼티 임의 조회 — 이 앱에 주입된 모든 시크릿(`TOSS_SECRET_KEY` 등) 노출 가능.
- `Runtime.exec` 등을 통한 임의 명령 실행(RCE) — 컨테이너 전체 장악 가능.

## 증거 (재현 확인)

2026-08-25, `docker compose up --build` 후 로컬에서 재현: 위 페이로드로 `sortKeys`에 컨테이너 `HOSTNAME`(`05a1da218305`)이 그대로 노출되는 것을 확인 — 임의 정적 메서드 호출(따라서 임의 코드 실행 등가)이 가능함을 증명.

## 조치 상태: 미조치 (의도된 취약점)
