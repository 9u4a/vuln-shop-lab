# 12. 가입 프로필 필드 · Toss 결제 정상화 · FAQ/공지 검색·페이지네이션

브랜치: `feature/signup-fields-checkout-fix-search` · 관련 취약점: VULN-004

## 무엇을 만들었나
- 장바구니 정리: "주문 webhook URL" 입력 필드 제거. 백엔드는 여전히 `webhookUrl`을 받아 SSRF가 API 레벨로 유효 — **VULN-004**로 문서화(VULN-001의 검색창과 같은 관계).
- Toss 결제 정상화: 설정된 키가 결제위젯 키(`test_gck_*`)인데 앱은 SDK v1이라 매 결제가 즉시 실패했다. `@tosspayments/tosspayments-sdk` v2로 교체하고 위젯 2단계 흐름(`renderPaymentMethods`/`renderAgreement` → `requestPayment`)으로 재작성.
- 가입 필드 확장: `users`에 `name`·`phone`·`postcode`·`address`·`address_detail` 추가(상세주소 외 필수). 주소 검색 팝업 `AddressSearchModal`(클라 더미 목록 `data/dummyAddresses.js`, 약 18건).
- FAQ 작성 개방: `POST /faqs`를 관리자 전용 → `requireAuth`로. 작성자 저장, PUT/DELETE는 관리자 유지.
- FAQ·공지 검색+페이지네이션: `q`/`page`/`pageSize` + `{total,page,pageSize}`, 재사용 `Pagination.jsx`·`.search-row`.

## 이후 변경
- `dummyAddresses.js` 클라 필터 → 서버 조회 엔드포인트(`/api/addresses`, 더미 74건)로 대체(33). FAQ 전체 개방은 32에서 관리자 전용 게시판으로 환원.
