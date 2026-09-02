# 60. 상품권 발급·구매 재구성

브랜치: `feature/giftcard-search-qna-notify` · 관련 취약점: [VULN-048](../vulnerabilities/VULN-048-predictable-giftcard-code.md), [VULN-043](../vulnerabilities/VULN-043-gift-card-redeem-reuse.md)(유지)

## 무엇을 만들었나

- 상품권 모델을 "관리자 개별 카드 발행"에서 **액면가 정의 → 사용자 구매 → 코드 발급**으로 재구성.
- **관리자**: 액면가(`gift_card_products`: name·amount·active) CRUD. 관리자 상품권 탭이 개별 카드 발행 →
  **액면가 관리**로 바뀜(AdminGiftCards). 1만/5만/10만원권 시드.
- **사용자 구매**: `POST /giftcards/purchase {productId}` — 액면가를 골라 구매하면 `gift_cards` 행을 본인
  소유(`owner_id`)로 발급하고 **유추 가능한 코드**(VULN-048)를 생성해 반환. **무-Toss 랩 재현성 위해 결제는
  완료로 간주(포인트 차감 없음)**. 발급 알림 1건. 마이페이지에 "상품권 구매"·"내 상품권" 섹션.
- **등록(사용)**: 기존 `POST /giftcards/redeem` 유지 — 코드 잔액을 포인트로 적립. **소유권·중복 미검증
  유지**(VULN-043). "내 상품권" 목록의 등록 버튼 또는 코드 직접 입력으로 사용.
- 스키마: `gift_card_products` 신규, `gift_cards`에 `owner_id`·`product_id`(nullable, 데모 카드 호환) 추가.

## 설계 판단

- 액면가는 쿠폰(coupons) 템플릿 + `POST /:id/claim` 취득 패턴을 미러. 발급 카드는 `gift_cards`에 owner를 붙여 재사용.
- 결제를 무료 모의 발급으로 둔 이유: `confirm`이 `TOSS_SECRET_KEY` 필요(무-Toss 랩 501) — feature 53과 동일
  제약. 보안 초점을 "유추 가능한 코드"(VULN-048)에 두고 구매 자체는 완결적으로 재현되게 함.
- 코드 생성을 단순 순번이 아닌 **키리스 3단계 변환**(payload→XOR→base64url)으로 만들어 난이도를 올리되,
  CSPRNG가 없어 여전히 역산·위조 가능하도록 남김(VULN-048). node `gift-code.js`/java `GiftCodes.java` 공용화.

## 이후 변경

- 정상화 시: 코드를 CSPRNG 128비트+로 생성, 등록을 원자적 1회성으로(소유권·중복 검증). 구매를 실제 결제/
  포인트 차감과 연결. 관련 [[VULN-048-predictable-giftcard-code]], [[VULN-043-gift-card-redeem-reuse]].
