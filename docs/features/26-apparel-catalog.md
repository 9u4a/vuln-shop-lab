# 26. 의류 카탈로그 (도메인 전환 · 카테고리 메뉴 분리 · 필터)

브랜치: `feature/apparel-catalog` · 관련 취약점: VULN-001, VULN-005 (표면 확장)

상품 도메인을 테크 가젯에서 **의류 쇼핑몰**로 전환한다. 요청받은 카테고리(상의·바지·가방·
모자·액세서리)와 필터(성별·컬러·소재)를 지원하기 위한 토대 단계로, 이후 좋아요·후기 고도화·
장바구니·관리자 로그 단계가 이 카탈로그 위에 얹힌다.

## 데이터 모델 — `products` 컬럼 추가 (양 스택)

`gender`(남성/여성/공용), `color`, `material` 3개 컬럼 추가. `reviewCount`는 조회 시 계산해
응답에만 싣는다(node: 서브쿼리 집계, java: `@Transient` + `ReviewRepository.countByProductId`).

- node: `apps/node-express/src/db.js` — CREATE TABLE + guarded `ALTER TABLE … ADD COLUMN`,
  `toProduct` 매퍼 확장.
- java: `entity/Product.java` 필드 3개 + `@Transient Long reviewCount`(ddl-auto 자동 반영).

## 카테고리 taxonomy

슬러그 `top/bottom/bag/hat/acc` ↔ 라벨 상의/바지/가방/모자/액세서리. 카테고리별 단색
플레이스홀더 이미지(`seed-images/apparel-<slug>.svg`)를 양 스택 seed-images에 생성해 시드에서 사용.

## 시드 재작성 (양 스택, 16종)

성별·컬러·소재·옵션(사이즈 등)을 다양화한 의류 16종. `코튼 조거팬츠`는 `stock=0`(품절 필터
확인용). 기존 reviews/orders 시드는 새 상품 index/가격/옵션에 맞춰 조정. **클린 재시드 필요**
(`docker compose down -v`).

## 엔드포인트 — `GET /api/products` 필터 확장 (양 스택)

| 파라미터 | 처리 |
|----------|------|
| `q`, `category`, `gender`, `color`, `material` | 문자열 결합(바인딩 없음) — SQLi 표면 (VULN-001/005) |
| `minPrice`, `maxPrice` | 숫자 캐스팅 후 비교 |
| `inStock=1` | `AND stock > 0` |
| `sort` | `price/name` 등은 기존 정렬(node ORDER BY / java SpEL), `reviews`는 앱 레벨 후기순 |

응답 상품에 `gender/color/material/reviewCount` 포함. `GET /api/products/:id`도 `reviewCount` 포함.
관리자 상품 생성/수정(`POST/PUT /api/admin/products`)도 신규 3필드 수용.

## 클라이언트

- `src/data/categories.js` **신설** — 카테고리·성별·컬러·소재·정렬 값의 단일 출처.
  (기존 Home/Products/SiteFooter에 중복되던 카테고리 정의를 이 상수로 통합.)
- `pages/Products.jsx` — 카테고리 칩 + 필터 바(성별·컬러·소재 셀렉트, 가격 범위, 품절 제외
  체크, 정렬) + 결과 개수. 상태는 URL `useSearchParams`에 반영. `api.js.fetchProducts`가 신규
  파라미터 전달.
- 카테고리 **접근 메뉴 분리**: `SiteHeader.jsx`에 헤더 하단 카테고리 바(`.category-nav`),
  `SiteDrawer.jsx`에 "카테고리" 섹션. 각 항목 → `/products?category=<slug>`.
- `Home.jsx`·`SiteFooter.jsx` — 공유 상수 사용, 카피 의류 톤으로 갱신.
- `ProductDetail.jsx` — 스펙 테이블에 성별·컬러·소재 표시(카테고리는 라벨로).
- `AdminProducts.jsx` — 생성 폼에 성별·컬러·소재 입력, 카테고리 placeholder를 의류 슬러그로.
- `index.css` — `.category-nav*`, `.filter-bar*` 추가(모바일에서 카테고리 바 숨김, 드로어로 대체).

## 의도된 취약점

신규 필터 파라미터 `gender/color/material`을 기존 문자열 결합 쿼리에 그대로 이어붙여
**SQLi 표면을 확장**(신규 ID 없이 VULN-001 node / VULN-005 java 문서에 반영). Java의 products는
15컬럼이 되어 UNION 페이로드 컬럼 수도 갱신.

> 스키마·시드가 바뀌므로 클린 재시드 필요(`docker compose down -v && up --build`).

관련 취약점: `docs/vulnerabilities/VULN-001-sql-injection-product-search-node.md`,
`docs/vulnerabilities/VULN-005-sql-injection-product-search-java.md`
