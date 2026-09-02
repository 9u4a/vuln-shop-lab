# VULN-043 기프트카드 중복 등록(재사용) → 무한 적립

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A06:2025 Insecure Design (business logic)

## 위치

- `apps/node-express/src/routes/giftcards.js` — `POST /api/giftcards/redeem`가 코드로 카드를 찾아 잔액만큼
  적립금을 지급하지만, **카드를 소멸/사용처리하지 않고 등록 이력도 남기지 않는다**(멱등성·중복 검증 없음).
- `apps/java-spring/.../controller/GiftCardController.java` — `redeem()` 동일 구조. `user.setPoints(+balance)`
  후 카드를 그대로 둔다.

활성·미만료 검사는 하지만, "이미 등록된 카드인가"를 확인하지 않고 카드 잔액도 0으로 만들지 않아 같은 코드를
반복 등록할 수 있다(VULN-029 쿠폰 중복 발급 / VULN-032 추천 멱등성 부재 계열).

## 트리거 방법

```
POST /api/{node,java}/giftcards/redeem   {"code":"GIFT-DEMO-10000"}   (로그인 세션)
→ {"ok":true,"credited":10000}
같은 요청을 N회 반복 → 매번 +10000 적립 (무한 적립)
```

로그인 필요 → 인증 익스플로잇은 nginx `:8090` 경유(세션 쿠키 Secure). 코드 추측/유출과 결합하면 타인
소유 카드도 반복 소진할 수 있다.

## 영향

- 상품권 하나로 무제한 적립금 획득 → 사실상 무한 결제수단 확보(적립금은 결제 시 [[VULN-030-point-balance-manipulation]]
  경로로도 사용). 판매자 직접 금전 손실.

## 증거 (재현 확인)

2026-09-02, 로컬 재현(`:8090`, 세션 쿠키 재사용):
- node: user1이 `GIFT-DEMO-10000` 3회 등록 → 포인트 120100 → 150100(+30000).
- java: user2가 `GIFT-DEMO-30000` 2회 등록 → 포인트 3000 → 63000(+60000).
- 만료(`GIFT-EXPIRED-5000`)·비활성(`GIFT-INACTIVE-5000`)은 각각 400/404로 거부 — **유일하게 빠진 방어가
  중복 등록 차단**임을 확인. **양 스택 재현.**

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 등록을 원자적 트랜잭션으로 처리해 카드를 1회용으로 소멸(잔액 0·`redeemed_by`/`redeemed_at` 기록),
이미 등록된 카드 재등록 거부, 코드에 충분한 엔트로피 부여.
