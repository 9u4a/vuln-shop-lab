# 10. 상품 상세 속성/옵션 · 마이페이지 분할 · 네비 정리

브랜치: `feature/product-details-mypage-nav`

## 무엇을 만들었나
- 더미 상품 이미지: 300x200 단색 PNG 5종을 순수 파이썬 인코더로 생성, `seed-images/` → 최초 기동 시 `uploads/`로 복사.
- 상품 속성: `products`에 `brand`·`sku`·`stock`(기본 100)·`option_name`·`option_values` 추가(guarded ALTER / `ddl-auto`). 상세 페이지에 스펙 표.
- 수량·옵션 선택: 수량 입력 + 옵션 `<select>`, 장바구니 라인 키를 `productId::option`으로, `order_items.option_value`로 결제까지 반영.
- 마이페이지 분할: `pages/mypage/{MyPageLayout,MyPageProfile,MyPagePassword}`, `/mypage`. 비밀번호 변경 전 재인증 게이트(`POST /profile/verify-password`).
- 관리자 상품 폼에 brand/sku/stock/옵션 노출. 상단 네비에서 관리자 링크 일시 숨김(표시용 변경, 접근 제어 불변).

## 설계 판단
- java `Product.stock`이 `int NOT NULL`이라 기존 DB에 컬럼 추가 시 `ddl-auto`가 실패 → `@ColumnDefault("100")`로 해결. **이후 NOT NULL 컬럼 추가 시 반복되는 함정.**

## 이후 변경
- 테크 가젯 더미(키보드/마우스/모니터 등)는 26에서 의류로 전면 재시드. 관리자 네비 숨김은 11에서 역할 기반으로 복구.
