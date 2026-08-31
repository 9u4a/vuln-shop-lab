# 37. 관리자/스토어프론트 개선 배치 (11개 항목)

브랜치: `feature/admin-storefront-improvements`

대량 더미(각 50~100개) 반영 후 드러난 사용성 문제와 버그를 일괄 개선. 의도된 취약점은 보존.

## 무엇을 만들었나

**A. 빠른 수정**
- 상품 관리 진입 오류: `AdminProducts.jsx`의 `ConfirmDialog` **import 누락**(ReferenceError →
  전역 ErrorBoundary 폴백)을 수정.
- Q&A 툴바 정렬: `.search-row input`과 `.btn-sm` 높이 불일치 → 공용 컨트롤 높이(40px)로 정렬,
  문의하기 버튼을 검색 버튼과 동일 크기로.
- 공지 목록 이미지: `Notices.jsx` 목록에 `SafeImage` 썸네일 노출(상세만 있던 것 보완).
  ※ 이미지 업로드 자체는 공지·이벤트 모두 `AdminImageField`로 이미 구현돼 있었음.
- 푸터 사이트맵: 이용약관·개인정보 링크를 `/notices` → `/terms`로, 주문내역은 로그인 시에만 노출.

**B. 이벤트 노출기간 · 팝업 도배 해결**
- `EventPopups.jsx`가 **노출기간(시작·종료)이 둘 다 설정된** 이벤트만 팝업으로 표시 → 윈도 없는
  더미 57건은 목록엔 남되 팝업엔 안 뜸("노출기간 동안만 팝업" 충족).
- 큐레이트 3건(여름페어/웰컴/무료배송)에 노출기간 부여(node/java 시드). 관리자 `EventForm`엔 시작/종료
  datetime 입력이 이미 있음.

**C. 회원가입 약관 동의**
- `pages/Terms.jsx` 신설 + 라우트 `/terms`(이용약관·개인정보 처리방침, 데모 문구).
- `Signup.jsx`에 동의 영역(전체동의/[필수]이용약관/[필수]개인정보/[선택]마케팅). 필수 미동의 시 제출 차단.

**D. 관리자 페이징 + 등록 폼 상단 토글**
- 8개 관리자 목록 페이지에 **클라이언트 사이드 페이징**(`Pagination.jsx` + `slice`, 페이지당 10~15).
  `AdminFaq`/`AdminNotices`는 `pageSize:200`으로 전량 로드(기존 50 캡으로 60건 중 10건 누락 버그 해소).
- 하단에 밀려 있던 생성 폼을 상단 "+ 추가" 토글 버튼으로 접기/펼치기(FAQ/공지/이벤트/쿠폰/상품).

**E. 관리자 사용자/주문 상세 모달 + 수정 API**
- 공용 모달 셸 `components/Modal.jsx` 신설.
- 사용자: 행 클릭 → 모달에 프로필 편집 폼 + 역할(system_admin만)·활성 토글 + 주문 목록.
  - 신규 API(양 스택): `PUT /api/admin/users/:id`(requireAdmin, name/phone/postcode/address/
    address_detail/bio만 — 역할·비밀번호 제외).
- 주문: 행 클릭 → 모달에 품목 + **상태 변경**(pending/paid/failed/cancelled).
  - 신규 API(양 스택): `PUT /api/admin/orders/:id/status`(requireAdmin).
  - `api.js` `updateAdminUser`, `updateOrderStatus`.

**F. 반응형 보완**
- `.order-row` `flex-wrap`, 컨트롤 높이 정렬, 모달/그리드 모바일 1열, `.summary-box`/`.modal` 패딩 축소.

## 취약점 보존
- 신규 `PUT /admin/users/:id`는 관리자 전용·화이트리스트 필드만 → 역할/비밀번호 변경 불가(권한 상승
  표면 신설 없음). VULN-013(프로필 대량 할당, `/profile`)은 그대로.
- 접속 로그 뷰어 `dangerouslySetInnerHTML`(VULN-028), 비밀글 마스킹, `?userId=` IDOR, VULN-007 등 미변경.

## 검증
- node `-c`, java 빌드, client `npm run build` 무오류. 클린 재시드.
- 이벤트 팝업 대상 = 노출기간 설정 3건(활성 48건 중), 양 스택 동일.
- 신규 API(양 스택): `PUT /admin/users/:id` 200(반영 확인)·비인증 401, `PUT /admin/orders/:id/status`
  200·잘못된 상태 400. VULN-007 스택트레이스 보존 확인. `scripts/smoke.sh` SMOKE PASS.
