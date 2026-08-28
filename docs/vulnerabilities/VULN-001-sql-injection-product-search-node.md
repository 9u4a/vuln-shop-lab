# VULN-001 SQL Injection in product search/filter/sort

- 대상 스택: node-express
- 심각도: Critical
- 분류: A03:2021 Injection (SQL Injection)

## 위치

`apps/node-express/src/routes/products.js`, `GET /api/products` — `q`, `category`, `sort` 및 의류 전환 시 추가된 필터 파라미터 `gender`, `color`, `material`을 파라미터 바인딩 없이 SQL 문자열에 직접 이어붙인다.

```js
let sql = 'SELECT * FROM products WHERE 1=1';
if (q) sql += ` AND name LIKE '%${q}%'`;
if (category) sql += ` AND category = '${category}'`;
if (gender) sql += ` AND gender = '${gender}'`;
if (color) sql += ` AND color = '${color}'`;
if (material) sql += ` AND material = '${material}'`;
// ...minPrice/maxPrice는 Number()로 캐스팅, inStock은 고정 문자열
if (sort && !APP_SORTS.has(sort)) sql += ` ORDER BY ${sort}`;
```

> 의류 카탈로그(`feature/apparel-catalog`, `docs/features/26-apparel-catalog.md`)에서 필터
> 파라미터 `gender/color/material`이 추가되며 인젝션 표면이 넓어졌다 — 문자열 결합 방식은 동일.
> `minPrice/maxPrice`는 `Number()`로, `inStock`은 고정 문자열로 처리해 인젝션 대상이 아니다.

## 트리거 방법 (UNION 기반, `users` 테이블 덤프)

```
GET /api/products?category=nonexistent' UNION SELECT id, username, password_hash, 0, '', role, created_at FROM users -- 
```

`products` 테이블 컬럼 순서(`id, name, description, price, image_url, category, created_at`)에 맞춰 `users` 테이블을 UNION SELECT하면, 응답의 `products` 배열에 `name=<username>`, `description=<password_hash>`인 가짜 상품이 사용자 수만큼 섞여 나온다.

`sort` 파라미터도 `ORDER BY`에 그대로 들어가므로 blind/error-based 인젝션 지점으로 별도 사용 가능 (예: `sort=(SELECT CASE WHEN (1=1) THEN id ELSE name END)`).

`q` 파라미터 역시 동일하게 취약 (`' OR '1'='1` 류의 조건 우회). 신규 필터 파라미터도 마찬가지 — 예: `GET /api/products?color=nomatch' OR '1'='1` → 조건이 우회되어 전체 상품 반환.

## 영향

- 모든 사용자의 bcrypt 해시(`password_hash`)를 포함한 임의 테이블 전체 덤프 가능.
- 같은 원리로 이 앱 DB의 다른 어떤 테이블도 추출 가능 (일반화된 정보 유출).

## 증거 (재현 확인)

2026-08-25, `docker compose up --build` 후 로컬에서 재현: 회원가입한 사용자(`noflag_node`, `victimuser`)의 실제 bcrypt 해시(`$2a$10$...`)가 위 페이로드로 `products` 응답에 그대로 노출되는 것을 확인.

## 조치 상태: 미조치
