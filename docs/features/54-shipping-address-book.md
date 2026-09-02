# 54. 배송지 주소록

브랜치: `feature/ux-completeness` · 관련 취약점: [VULN-044](../vulnerabilities/VULN-044-address-idor.md)

## 무엇을 만들었나

- 여러 배송지를 저장하고 기본 배송지를 지정하는 **주소록**. 마이페이지 "배송지 관리" 탭에서 추가/수정/삭제,
  체크아웃(Cart)에서 **저장된 배송지 선택** 드롭다운으로 배송지 자동 입력.
- 서버: `GET/POST/PUT/DELETE /api/shipping-addresses`. 신규 `addresses` 테이블/`Address` 엔티티
  (user_id, label, name, phone, postcode, address, address_detail, is_default). 양 스택 동일.
- 주소 검색은 기존 `AddressSearchModal`(도로명 조회)을 재사용.

## 설계 판단

- 기존에는 `users`의 단일 주소 + 주문 시 스냅샷뿐이라, 여러 배송지를 관리할 수 없었다. 1:N 주소록을
  `product_likes`(per-user 리스트) 구조를 확장해 신설했다. 라우트 경로는 기존 정적 주소검색(`/api/addresses`)과
  구분해 `/api/shipping-addresses`로 두었다.
- 수정/삭제에 소유권 검증을 넣지 않아 IDOR가 성립한다(VULN-044).

## 이후 변경

- 정상화 시: PUT/DELETE에서 대상 주소의 `user_id`가 세션 사용자와 일치하는지 확인(불일치 404/403).
