# VULN-032 추천 보상 무한 적립 (멱등성·자기참조 미검증)

- 대상 스택: node-express, java-spring
- 심각도: Medium
- 분류: A04:2021 Insecure Design (Business Logic, CWE-770 Missing Limit / CWE-799 Improper Control of Interaction Frequency)

## 위치

추천 코드 적용 엔드포인트가 **1인 1회 제한·자기참조 차단·유효성 검증 없이** 매 호출마다 호출자와
코드 소유자 양쪽에 포인트를 적립한다.

- node: `apps/node-express/src/routes/referral.js`, `POST /referral/apply` —
  호출 시마다 무조건 `points += 1000`, 코드가 존재하면 소유자에게도 적립(자기 코드도 허용).
- java: `apps/java-spring/.../controller/ReferralController.java`, `apply` — 동일.

## 트리거 방법

```
POST /api/referral/apply {"code":"REFUSER1"}   (user1이 자신의 코드로, 반복 호출)
→ 호출할 때마다 호출자 +1000P, 코드 소유자 +1000P 적립(멱등성/자기참조 검증 없음)
```

## 영향

- 자기 자신을 추천하거나 동일 요청을 반복해 포인트를 무한 적립 → 리워드/프로모션 예산 남용.

## 증거 (재현 확인)

2026-08-31, 클린 재시드 후 로컬 재현(양 스택 동일): user1이 자신의 코드 `REFUSER1`로 `apply`를
반복 호출했을 때 매번 `reward:1000` 응답 + 포인트 원장에 "추천인 보상/추천 코드 적용"이 계속 적립됨.

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: `referred_by`가 이미 있으면 재적용 거부(1인 1회), 코드 소유자 != 호출자 검증(자기참조 차단),
존재하지 않는 코드는 오류 반환. 리워드는 실제 가입/구매 완료 등 이벤트 기준으로만 지급.
관련: [[VULN-029-coupon-claim-no-dedup]], [[VULN-030-point-balance-manipulation]](포인트 잔액 조작).
