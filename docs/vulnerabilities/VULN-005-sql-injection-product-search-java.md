# VULN-005 상품 검색/필터 SQL 인젝션 (001의 java 짝)

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A05:2025 Injection (SQL Injection)

## 위치

`apps/java-spring/src/main/java/com/vulnlab/shop/service/ProductService.java`, `GET /api/products` — `q`, `category` 및 의류 전환 시 추가된 필터 파라미터 `gender`, `color`, `material`을 파라미터 바인딩 없이 native SQL 문자열에 직접 이어붙여 `EntityManager.createNativeQuery()`로 실행. VULN-001(node)과 동일한 엔드포인트/트리거 지점의 java 버전.

```java
StringBuilder sql = new StringBuilder("SELECT * FROM products WHERE 1=1");
if (hasQuery) sql.append(" AND LOWER(name) LIKE LOWER('%").append(query).append("%')");
if (hasCategory) sql.append(" AND category = '").append(category).append("'");
if (hasGender) sql.append(" AND gender = '").append(gender).append("'");
if (hasColor) sql.append(" AND color = '").append(color).append("'");
if (hasMaterial) sql.append(" AND material = '").append(material).append("'");
entityManager.createNativeQuery(sql.toString(), Product.class).getResultList();
```

> 의류 카탈로그(`feature/apparel-catalog`, `docs/features/26-apparel-catalog.md`)에서 필터
> 파라미터 `gender/color/material`이 추가되며 인젝션 표면이 넓어졌다. `minPrice/maxPrice`는
> `Long.parseLong`으로 캐스팅, `inStock`은 고정 문자열이라 인젝션 대상이 아니다.

## 트리거 방법

```
GET /api/products?color=nomatch' OR '1'='1     → 조건 우회, 전체 60건 반환 (인젝션 sink 확인)
GET /api/products?category=zzz' OR '1'='1      → 동일 (category 벡터)
```

`q` 벡터는 `LOWER(name) LIKE LOWER('%…%')` 안이라 주입 시 `LOWER(` 괄호를 닫아야 한다
(`q=…%') …-- `). `category/gender/color/material`은 `= '…'` 형태라 곧바로 주입된다.

**UNION 덤프의 재현 제약(중요)**: 쿼리를 `createNativeQuery(sql, Product.class)`로 실행하므로,
Hibernate가 결과를 **Product 엔티티로 매핑**한다. 그래서 `UNION SELECT … FROM users`로 다른 테이블을
붙여도 union된 비-product 행이 결과 목록에 **표면화되지 않는다**(로컬 확인: 여러 벡터·필러 조합 모두
`users` 행이 응답에 안 나오고 product만/빈 목록 반환). 또한 `users`에는 `description/price/image_url/…`
컬럼이 없어 문서 예전 페이로드(그 컬럼명으로 SELECT)는 애초에 컬럼 부재로 실패한다. 즉 **node(VULN-001)의
raw-row 매핑과 달리, java 스택에서는 UNION 기반 임의 테이블 덤프가 그대로는 재현되지 않는다.** 실질
추출은 boolean/error-based blind(조건 분기 + `ORDER BY`/`price >=` 산술) 경로가 필요하다.

## 영향

- SQL 인젝션 sink가 실재하며 조건 우회가 확인됨. blind 기법으로 `users`(bcrypt 해시 포함) 등 임의
  테이블 데이터 추출 가능. 단 UNION 직접 덤프는 위 매핑 제약으로 node만큼 간단하지는 않다.
  VULN-001(node)과 동일 지점의 java 버전.

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`): `?color=x' OR '1'='1` → 전체 60건 반환(sink 확인). `?category=zzz` 정상
0건. UNION으로 `users`를 붙이는 여러 시도(`category`/`q` 벡터, NULL/타입 필러, `UNION`/`UNION ALL`,
단일 사용자 한정)에서 union된 사용자 행은 응답에 나타나지 않음 — Hibernate `Product.class` 결과 매핑
제약 확인. (node VULN-001은 동일 날짜 15컬럼 UNION으로 해시 덤프 성공.)

## 조치 상태: 미조치 (의도된 취약점)
