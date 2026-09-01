# VULN-001 상품 검색/정렬 SQL 인젝션

- 대상 스택: node-express
- 심각도: Critical
- 분류: A05:2025 Injection (SQL Injection)

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

쿼리는 `SELECT * FROM products ...`이고 현재 `products`는 **15컬럼**이라, UNION은 **정확히 15컬럼**이어야
한다(7컬럼 등 개수가 안 맞으면 SQLite 예외 → `try/catch`에 걸려 400, 덤프 실패). 또 `option_values`
컬럼 위치(14번째)는 `toProduct`가 `.split(',')`로 처리하므로 숫자 필러를 넣으면 매핑 단계에서 크래시한다
(그 자체가 VULN-007 dev 스택트레이스 노출). 필러는 **`NULL`**로 둔다.

```
GET /api/products?q=zzz' UNION SELECT id,username,password_hash,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL FROM users-- -
```

응답의 `products` 배열에 `name=<username>`, `description=<password_hash>`인 가짜 상품이 사용자 수만큼
섞여 나온다(`id, username, password_hash` + `NULL`×12 = 15컬럼).

`sort` 파라미터도 `ORDER BY`에 그대로 들어가므로 blind/error-based 인젝션 지점으로 별도 사용 가능 (예: `sort=(SELECT CASE WHEN (1=1) THEN id ELSE name END)`).

`q` 파라미터 역시 동일하게 취약 (`' OR '1'='1` 류의 조건 우회). 신규 필터 파라미터도 마찬가지 — 예: `GET /api/products?color=nomatch' OR '1'='1` → 조건이 우회되어 전체 상품 반환.

## 영향

- 모든 사용자의 bcrypt 해시(`password_hash`)를 포함한 임의 테이블 전체 덤프 가능.
- 같은 원리로 이 앱 DB의 다른 어떤 테이블도 추출 가능 (일반화된 정보 유출).

## 증거 (재현 확인)

2026-09-01, 로컬 재현(`:8090`): 위 15컬럼 UNION 페이로드로 `products` 응답에 `9u4a`/`admin`/`user1`…의
실제 bcrypt 해시(`$2a$10$Yfkj2TX…`, `$2a$10$aNC3Z4y…`, `$2a$10$I2ym82Y…`)가 그대로 노출됨. 7컬럼 UNION은
HTTP 400(개수 불일치)이고, boolean 우회(`?color=x' OR '1'='1`)는 전체 60건 반환으로 별도 확인.

## 조치 상태: 미조치 (의도된 취약점)
