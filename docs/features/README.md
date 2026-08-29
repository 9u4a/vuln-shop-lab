# 기능 설계 문서 — 인덱스

기능(및 버그 수정·리팩터·취약점 배치) 하나당 문서 1건. 파일명은 `NN-<slug>.md`, 각 문서는
`무엇을 만들었나 / 설계 판단 / 이후 변경`과 관련 취약점 링크를 담는다. 취약점 명세는
[`docs/vulnerabilities/`](../vulnerabilities/README.md)에서 같은 VULN ID로 추적한다.

| NN | 제목 | 브랜치 | 관련 VULN | 요약 |
|----|------|--------|-----------|------|
| 01 | 프로필 · 역할 기반 인증 | feature/profile-roles | — | bio/아바타, requireAuth/Admin, 스키마 선반영 |
| 02 | 장바구니 · 주문 · 결제(Toss) | feature/cart-orders-payment | 004 | 서버 가격 계산, Toss 테스트 결제, 주문 이력 |
| 03 | 상품 리뷰 | feature/reviews | 008,009 | 리뷰 조회/작성 |
| 04 | 관리자 패널 | feature/admin-panel | — | 사용자·주문·상품 관리, 역할 가드 |
| 05 | 상품 검색·필터·정렬 | feature/search-filters | 001,002 | 첫 의도적 취약점(SQLi·SpEL) |
| 06 | 마이페이지 · UI/UX 정비 | feature/mypage-and-uiux | — | 비밀번호 변경, 토큰 기반 CSS |
| 07 | 세션 동기화 수정 · 토스트 | fix/session-sync-and-toast | — | 로그인 후 네비 갱신, 접속 토스트 |
| 08 | 역할 3단계 + FAQ | feature/role-tiers-and-faq | — | system_admin 계층, FAQ 게시판 |
| 09 | 관리자 서브페이지 · 공지 · 이미지 | feature/admin-subpages-notices-images | — | /admin 분리, 공지, 403/404, 상품 이미지 |
| 10 | 상품 상세/옵션 · 마이페이지 분할 | feature/product-details-mypage-nav | — | brand/sku/stock/옵션, /mypage 분할 |
| 11 | 관리자 네비 복구 · 기본 계정 시드 | feature/admin-nav-default-creds | — | 9u4a system_admin 시드 |
| 12 | 가입 필드 · Toss 정상화 · 검색 | feature/signup-fields-checkout-fix-search | 004 | 주소 팝업, 위젯 결제, FAQ/공지 검색 |
| 13 | 원화(KRW) · 전면 한글화 | feature/krw-currency-korean-localization | — | 정수 원화, UI·에러 메시지 한글 |
| 14 | Nginx 웹서버 계층 · 시드 보강 | feature/nginx-was-tier-and-seed-data | — | 2계층 아키텍처, 데모 시드 |
| 15 | Nginx 포트 충돌 수정 | fix/nginx-port-burp-conflict | — | 8080→8090(Burp 회피) |
| 16 | 관리자 통계 엔드포인트 | refactor/admin-stats-endpoint | — | /admin/stats 개수 집계 |
| 17 | 취약점 배치 005~012 | feature/vuln-batch-005-013 | 005~012 | SQLi·세션·XSS·IDOR·커맨드·경로·역직렬화 |
| 18 | 취약점 인덱스·스코프 정비 | chore/vuln-index-refresh | — | README 인덱스 신설 |
| 19 | 취약점 배치 013·014 | feature/vuln-batch-013-access-control | 013,014 | 대량 할당, CSRF |
| 20 | 취약점 배치 015 | feature/vuln-batch-015-business-logic | 015 | 음수 수량 결제액 조작 |
| 21 | 취약점 배치 016~018 | feature/vuln-batch-016-xss-and-upload | 016,017,018 | 반사형·DOM XSS, 파일 업로드 |
| 22 | 취약점 배치 019~021 | feature/vuln-batch-019-java-injection | 019,020,021 | Java 커맨드·XXE·Text4Shell |
| 23 | 취약점 배치 022 | feature/vuln-batch-022-nosqli | 022 | Mongo 활동 피드 NoSQLi |
| 24 | 스토어프론트 UI 리디자인 | feature/storefront-ui-redesign | — | 미니멀 프리미엄 리스킨 + 관리자 사용성 |
| 25 | 이벤트 팝업 | feature/event-popups | 023 | 관리자 게시 메인 팝업 |
| 26 | 의류 카탈로그 | feature/apparel-catalog | 001,005 | 도메인 전환, 카테고리 분리, 필터 |
| 27 | 좋아요/찜 · 위시리스트 · 바로 구매 | feature/product-likes | 024 | 찜 토글, 위시리스트 IDOR |
| 28 | 후기 사진 · 비밀글 | feature/reviews-media-secret | 025,026 | 이미지 업로드, 비밀 후기 |
| 29 | 장바구니 옵션 변경 | feature/cart-option-edit | 027 | 라인 옵션 인라인 변경 |
| 30 | 관리자 접속 로그 · 활성화 | feature/admin-access-logs | 028 | 로그인 로그, 계정 활성/비활성 |
| 31 | 이벤트 페이지 · 쿠폰 · 업로드 · 네비 | feature/events-coupons-uploads | 029 | 이벤트/쿠폰, 파일 업로드 전환, 한 줄 네비 |
| 32 | Q&A 게시판 · FAQ 관리자화 · 버튼 배치 | feature/qna-faq-board | 003 | Q&A 문의, FAQ 게시판화 |
| 33 | 주소 검색 서버화 · 푸터 보강 | feature/address-search-footer | — | 서버 주소 조회, 더미 74건, 사이트맵 |
| 34 | 안정성·편의성 개선 | feature/ux-and-node-safety | — | 삭제 확인 모달, 이미지 폴백, 재고 경고, Node 크래시 방지 |
| 35 | 안정성 강화 | feature/stability-hardening | — | ErrorBoundary, 에러 처리, 헬스체크·restart, nginx gzip, 개발 스크립트 |
