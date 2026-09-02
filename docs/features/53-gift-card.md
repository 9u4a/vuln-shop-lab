# 53. 기프트카드/상품권

브랜치: `feature/gift-card` · 관련 취약점: [VULN-043](../vulnerabilities/VULN-043-gift-card-redeem-reuse.md)

## 무엇을 만들었나

- **상품권 발행·등록** 기능. 관리자 "상품권" 탭(`/admin/gift-cards`)에서 코드+금액+만료로 발행하고,
  고객은 마이페이지 "포인트·추천" 탭의 **상품권 등록**에서 코드를 입력하면 잔액이 **적립금(포인트)으로 전환**된다.
- 서버: `GET /api/giftcards/lookup/:code`(잔액 조회), `POST /api/giftcards/redeem`(등록→적립),
  관리자 CRUD(`/manage`, `POST /`, `PUT /:id`, `DELETE /:id`). 양 스택 동일.
- 신규 `gift_cards` 테이블/`GiftCard` 엔티티(code·balance·initial_balance·active·expires_at). 데모 카드
  4종 시드(GIFT-DEMO-10000/30000 활성, INACTIVE/EXPIRED 거부용).

## 설계 판단

- 쿠폰(정률/정액 할인)과 포인트(적립금)는 있었지만 **상품권(선불 금액권)** 이 없었다. 쿠폰
  발행/관리 UI(AdminCoupons)와 포인트 원장(point_transactions)을 그대로 미러해 얹었다.
- **체크아웃 직접 차감 대신 "상품권 등록 → 적립금 전환" 모델**을 택했다. 이유: 결제 확정(confirm)은
  `TOSS_SECRET_KEY`가 있어야 동작(무-Toss 랩에선 501)이라, 포인트/쿠폰처럼 confirm 시점에 잔액을 차감하면
  랩에서 상품권 소비 경로 자체가 재현 불가가 된다(감사에서 VULN-030/036이 같은 제약으로 지적됨). 등록→적립
  모델은 무-Toss 랩에서 완결적으로 재현되며, 실제 커머스의 "상품권 등록 시 적립금 전환"과도 자연스럽다.
- 등록의 멱등성(중복 등록 차단·카드 소멸)을 의도적으로 빼 취약점을 남겼다(VULN-043).

## 이후 변경

- 정상화 시: 등록을 원자적 트랜잭션으로 처리해 카드를 1회용으로 소멸(잔액 0·`redeemed_by` 기록),
  이미 등록된 카드 재등록 거부, 코드에 충분한 엔트로피 부여(추측 방지).
- (기능 60, 2026-09-02) 모델 재구성: 관리자 개별 카드 발행 → **액면가 정의 + 사용자 구매 발급**으로 변경.
  구매 발급 코드가 유추 가능([[60-giftcard-purchase]], VULN-048). redeem(등록) 로직·VULN-043은 유지.
