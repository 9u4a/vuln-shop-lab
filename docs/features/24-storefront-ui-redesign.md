# 24. 스토어프론트 UI/UX 리디자인 (미니멀 프리미엄)

브랜치: `feature/storefront-ui-redesign`

## 무엇을 만들었나
기능은 완성돼 있으나 "범용 관리자 대시보드" 룩이던 클라이언트를 미니멀 프리미엄 한국 커머스 톤(니어 모노크롬·Pretendard·이미지 우선 카드)으로 재스타일. `/admin`은 토큰만 상속.

- 디자인 시스템: `index.css` 재작성 — 토큰(`--color-ink` 등)·라운드·그림자·타입 스케일·`tabular-nums` 가격·1200px 컨테이너·3단 반응형(1024/768/480). 레거시 셀렉터 유지로 미수정 페이지도 자동 재스타일. Pretendard를 **npm 번들**(외부 CDN 금지, 격리 랩 안전).
- 레이아웃 셸: `SiteHeader`(유틸 바 + 메인 바 + 검색 + 장바구니, ≤768px 햄버거), `SiteDrawer`(좌측 슬라이드, 라우트 변경 시 자동 닫힘), `SiteFooter`(4열, 더미 회사 정보 + 의도적 취약 데모 고지), `navLinks.js`(공유 네비 정의).
- 재사용 컴포넌트: `ProductCard`(이미지 우선)·`Skeleton`/`SkeletonGrid`·`EmptyState`·`StatusChip`.
- 페이지: `Home`(히어로+카테고리 타일+추천), `Products`(칩 필터+정렬 툴바), `ProductDetail`(2열 PDP+수량 스테퍼+별점), `Cart`(2열+요약 박스), 그 외 `EmptyState`/상태 화면 처리. 로그인/가입은 중앙 카드.
- 후속(같은 브랜치): 관리자 사용성 — 사용자/주문 상세 확장(`GET /api/admin/users/:id`·`/orders/:id`), FAQ/공지 인라인 편집, 상품 이미지 업로드 UI, 관리자 통계 카드·`.admin-table`.

## 설계 판단
- 의도된 취약점은 전부 보존: `Products`의 `q` 라벨(VULN-017), 리뷰 본문 렌더(VULN-008), 영수증 도구(VULN-010/011/016/019), java `/cart/import`(VULN-012).

## 이후 변경
- 여기서 만든 2단 네비(별도 `.category-nav` 바)는 31에서 한 줄로 통합됨.
