# 주소 검색 서버 조회화 · 더미 주소록 확장 · 푸터 사이트맵 보강

Branch: `feature/address-search-footer` (base: `main`)

사용자 요청 2건:
1. 주소 검색을 실제 조회 요청 방식으로 — 팝업에서 검색어 입력·검색 시 서버로 조회 요청을 보내고
   결과를 표시. 더미 주소록도 넉넉히 확장.
2. 푸터 사이트맵에 누락된 메뉴(이벤트·쿠폰·Q&A) 추가.

## 1. 주소 검색 (클라 필터 → 서버 조회)

기존 `AddressSearchModal`은 클라이언트 배열(`data/dummyAddresses.js`, 18건)을 입력 즉시
in-memory 필터링만 했다. 실제 우편번호 팝업처럼 **검색어 입력 후 서버로 조회 요청**을 보내도록 변경.
(실제 외부 우편번호 API는 격리 환경 원칙상 붙이지 않고, 로컬 더미 주소록을 백엔드에서 조회.)

**더미 주소록 확장 (18 → 74건)**: 전국 17개 시·도 도로명 주소를 담은 고정 픽스처.
- `apps/node-express/src/fixtures/addresses.json`, `apps/java-spring/src/main/resources/addresses.json`
  (동일 파일 — 생성 스크립트로 양쪽 동기화). 기존 `client/src/data/dummyAddresses.js`는 제거.
  (node는 `src/data/`가 `.gitignore` `data/` 규칙에 걸려 `src/fixtures/`에 둠.)

**조회 엔드포인트** (양 스택): `GET /api/addresses?q=<검색어>` → `{ addresses:[{zonecode,address}], total }`.
- `q` 비어 있으면 빈 결과(검색어 필수). 주소/우편번호 부분일치, 최대 30건 반환.
- node: `routes/addresses.js`(+ server.js 마운트). java: `controller/AddressController.java`
  (생성자에서 classpath `addresses.json` 로드 후 메모리 필터).

**클라이언트**:
- `api.js` `searchAddresses(base, q)` 추가.
- `AddressSearchModal.jsx`: 입력 + **검색 버튼/엔터**로 `searchAddresses` 호출(로딩·에러·"검색 결과 N건"
  표시), 결과 목록에서 선택 시 기존과 동일하게 `onSelect(zonecode,address)`. 회원가입 폼에서 사용.

## 2. 푸터 사이트맵 보강

헤더 메뉴(이벤트·쿠폰·공지·FAQ·Q&A)에 비해 푸터에 이벤트·쿠폰·Q&A가 빠져 있었다.
`components/SiteFooter.jsx`를 4열 → 5열로 재구성:
- 고객센터: 자주 묻는 질문, **Q&A 문의**(추가)
- 쇼핑: 전체 상품 + 카테고리(기존)
- **혜택·소식(신규 열)**: 이벤트, 쿠폰, 공지사항
- 이용안내: 이용약관, 개인정보 처리방침, 주문 내역
- `index.css` `.site-footer__inner` 그리드 5열로 조정(태블릿·모바일 반응형은 기존 2열/1열 유지).

## 의도된 취약점

- 없음. 주소 조회는 정적 픽스처 기반 읽기 전용 조회이고, 푸터는 표시용 링크 보강이라 새 취약점을
  심지 않음(요청도 기능 개선/버그성 보강).

## 검증

- node `-c`(addresses/server) OK, `addresses.json` 74건 로드 확인, client `npm run build` OK,
  `docker compose build java-spring` OK.
- 재빌드/기동 후 스모크(양 스택 동일):
  - `?q=`(빈값) → total 0, `?q=강남` → 1건, `?q=서울` → 20건, `?q=대로` → 22건, `?q=zzz` → 0건.
  - 상한 30건 이하 반환 확인.
