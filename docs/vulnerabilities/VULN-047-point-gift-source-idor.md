# VULN-047 포인트 선물 발신 계정 IDOR (차감 대상 미검증)

- 대상 스택: node-express, java-spring (동일)
- 심각도: High
- 분류: A01:2025 Broken Access Control (CWE-639 Authorization Bypass Through User-Controlled Key)

## 위치

- `apps/node-express/src/routes/points.js` — `POST /api/points/gift`가 차감 대상을 요청 본문의
  `fromUserId`로 신뢰하고 **세션 사용자와 일치하는지 검증하지 않는다**. 잔액도 그 `fromUserId` 기준으로만
  확인한다.
- `apps/java-spring/.../controller/PointController.java` — `gift()`가 동일하게 `fromUserId`로 발신 계정을
  조회·차감(세션 소유권 미검증).

정상 UI(마이페이지 포인트 선물)는 `fromUserId`를 보내지 않아 세션 사용자에서 차감되지만, API를 직접 호출해
`fromUserId`를 타 사용자로 지정하면 **그 사람의 포인트를 차감**할 수 있다.

## 트리거 방법

```
# 로그인(공격자) 세션으로 호출. 피해자(victimUserId)의 포인트를 공격자에게 이체.
POST /api/{node,java}/points/gift
  {"fromUserId": <victimUserId>, "toUsername": "<attacker>", "amount": 100000}
→ 피해자 users.points -= 100000, 공격자 += 100000. 원장에 발신/수신 2행 기록.
```

로그인 필요 → nginx `:8090` 경유(세션 쿠키 재사용).

## 영향

- 타 사용자의 적립금을 임의로 탈취(자기 계정으로 이체)하거나 소각. 발신 계정 잔액만 확인하므로 대상을
  바꿔가며 다수 계정을 드레인 가능. 금전적 가치(포인트=결제 차감)와 직접 연결.

## 증거 (재현 확인)

(Phase 2에서 `:8090` 실제 트리거 후 `YYYY-MM-DD 로컬 재현: fromUserId=<피해자>로 100000P 이체, 피해자
잔액 감소·공격자 잔액 증가 + 원장 2행` 기록 예정.)

## 조치 상태: 미조치 (의도된 취약점)

정상 구현: 차감 계정을 **세션 사용자로 강제**(요청 `fromUserId` 무시), 이체를 원자적 트랜잭션으로 처리,
자기 이체·음수·잔액 초과를 서버에서 검증. 관련: [[VULN-030-point-balance-manipulation]],
[[VULN-013-mass-assignment-profile-privesc]], [[VULN-031-refund-access-control]].
